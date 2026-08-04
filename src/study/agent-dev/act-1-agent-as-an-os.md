---
title: 第一幕 把 Agent 当成操作系统来设计
icon: mdi:application-cog-outline
order: 1
category:
  - Agent 开发
tag:
  - Rust
  - Agent
  - 架构
---

# 第一幕 把 Agent 当成操作系统来设计

## 在动手之前，先回答一个问题

如果 Agent 是操作系统，那"工具"是什么？

我的答案是系统调用。用户（GUI）想干活，走受控的 RPC 通道；大模型想干活，只能调注册过的工具；业务插件想碰资源，只能通过被授权的服务句柄。谁想绕过这些通道直接碰文件、碰配置、碰模型，机制上就不给。

今天把内核这一层拆开，讲清楚三件事：谁能调什么、插件怎么长出来、以及我为什么把注册表改了三遍。

## 内核插件与用户插件：信任边界

插件分成两类，对应操作系统的"内核态"和"用户态"。

内核插件在信任边界内，是特权子系统：

```
src/kernel/
├── storage/   # 会话 JSONL、错题本、审计日志
├── memory/    # 跨会话记忆路由
├── compute/   # 验算桥接（Pyodide）
└── model/     # 双模型服务（Responses + Chat Completions）
```

用户插件是业务，只能看到受限接口：

```
src/plugin/
├── grading/   # 批改（上传 → OCR → 判分 → 错题归档）
├── practice/  # 分层练习
├── report/    # 多周期报告
├── exam/      # 组卷考核
├── tracking/  # 长效追踪
├── memory/    # 记忆工具（用户侧入口）
├── compute/   # 验算工具
├── session/   # 会话切换（仅模型可见）
└── hello/     # 链路自检
```

目录组织是照着 Linux 内核来的：每个插件一个文件夹，`mod.rs` 就是它的 `__init__.py`。插件叫什么、要什么能力、暴露哪些工具，入口文件里一眼可见。

用户插件拿不到完整内核，只能拿到几个服务句柄。操作系统不会把整个内核内存映射给你，只给你文件描述符；这里也一样：

```rust
pub enum ServiceId {
    Storage, // 会话/错题/审计
    Memory,  // 记忆
    Compute, // 验算
    Model,   // 双模型
}
```

插件在 `Info` 里声明 `requires: vec![ServiceId::Storage, ServiceId::Model]`，注册阶段就只能拿到这两个句柄。没有声明，就没有能力。

## 两段式契约：先声明，后绑定

这是我改了三遍才定下来的设计，先看现在的样子。

第一阶段是静态元数据（`Info`）：插件声明自己的命名空间、需要哪些服务、暴露哪些工具、每个工具的参数 schema、谁能调用。它不包含任何 handler，纯数据。

第二阶段是注册（`register`）：把真实的 handler 绑定到工具名上。一个最简插件长这样（项目里的 hello 插件）：

```rust
impl UserPlugin for HelloPlugin {
    fn info() -> Info {
        Info {
            namespace: "demo".into(),
            tools: vec![ToolDef {
                name: "hello".into(),
                user_visible: false,
                title: Some("打个招呼".into()),
                group: Some("调试".into()),
                description: "打个招呼，测试 agent 链路是否通畅".into(),
                params: empty_params(),
                policy: CallerPolicy::UserAndModel,
                timeout: None,
                icon: Some("mdi:hand-wave".into()),
            }],
            ..Default::default()
        }
    }

    fn register(ctx: PluginContext<'_>) -> Result<(), PluginError> {
        ctx.registrar.tool("hello", Arc::new(|_, _| {
            Box::pin(async move { Ok(json!({ "reply": "你好，我是错题 Agent" })) })
        }))
    }
}
```

为什么非要拆两段？

模型调用工具前，要看到所有工具的 JSON Schema。如果插件是懒加载的，模型列表就得等插件全跑一遍才能生成，那就只能全部 Eager，启动变慢，无用插件也加载。静态元数据则可以先做全部校验：撞名、缺 schema、requires 声明了不存在的服务，注册阶段就能拒掉，不用等运行时炸。至于 handler，那是行为，只活在运行时；元数据是契约，可以序列化、可以审计、可以给 GUI 生成工具面板。

拆完这两段，`LoadPolicy` 就能放心用了：默认 Lazy（首次使用才真正执行 register），个别关键插件（比如会话切换）标 Eager，启动就绪。

## 谁也不能越界：CallerPolicy 双墙

工具定义了 `policy`，只有两种：

| 策略 | 谁能调 | 说明 |
|---|---|---|
| `UserAndModel` | 模型可调，用户必可调 | 通过 `trigger_command` 用户也能触发 |
| `UserOnly` | 仅用户可调 | 永远不出现在模型工具列表 |

注意这里没有"仅模型可调"。模型能用的，用户必须也能用。这是刻意的：Agent 是给学生用的工具，不是特权入口。

"双墙"是两道独立检查。第一道墙在生成模型工具列表时过滤，`UserOnly` 根本不出现在里面；第二道墙在 dispatch 层执行时再验一次调用方，即使模型通过某种方式拿到了名字，也照样拒绝。

具体例子：`memory::remove`（删除记忆）是 `UserOnly`。模型可以建议"要不要删掉这条记忆？"，但真正删，只能用户来。另一个是 `session::switch`：它是 `UserAndModel` 但 `user_visible: false`，模型能调，用户面板里不显示，因为用户不需要知道"会话切换"这个内部概念。

## 命名空间：撞名从机制上不可能

每个插件只写短名（`hello`、`upload`、`generate`），内核负责拼全名：

```
插件命名空间 + 短名 = 完整入口名
grading      + upload   = grading::upload
practice     + generate = practice::generate
memory       + remove   = memory::remove
```

两个插件想注册同一个全名？注册表直接拒绝。撞名不靠约定，机制上就撞不了。

还有一个细节：大模型 API 的函数名只允许 `[a-zA-Z0-9_-]`，不允许 `::`。所以发给模型时全名要映射成 wire name：

```
grading::upload  →  grading_upload
session::switch  →  session_switch
```

内部名、审计名、`trigger_command` 用的都是 `namespace::tool` 原样；只有 API 边界上做一次映射，模型返回时再映射回来。

## 三类入口：Tool / Command / Event

不是所有东西都该给模型调。入口分三类：

- **Tool**：模型可调（配合 policy），也常被 GUI 显式触发；
- **Command**：GUI/用户专用，恒为 `UserOnly`，比如设置、上传文件这种用户操作；
- **Event**：内核生命周期回调，不对外暴露，比如"会话切换了""记忆变了"。

GUI 触发命令只有一条通道：`trigger_command(entry, params)`。找不到同名 Command 时，回退放行同名 Tool，于是用户既能用命令面板，也能直接显式调用工具，但永远没有一条可以传任意文本执行任意东西的通道。前端门禁由此是结构性的，不是靠前端自觉。

## 结构化错误：让 loop 知道该不该重试

工具失败不能只回一句字符串，否则大模型只会瞎重试。每个错误都是结构化的：

```rust
pub struct ToolError {
    pub code: ToolErrorCode, // unknown_tool / invalid_params / handler_error / timeout ...
    pub message: String,
    pub retryable: bool,     // 驱动 agent loop 的护栏
}
```

`retryable` 决定 loop 的行为：参数错可以改参数重试；模型下架、余额不足这种系统性错误重试没意义，直接告诉用户。同一错误码连续失败三次，loop 主动停，防止模型在一个坑里无限打转。

## 收个尾

这套设计换来的是：能力边界（插件只见声明过的句柄）、双墙护栏（模型列表过滤 + dispatch 再拒绝）、可审计（每次调用是谁发的、成功没有、错了什么码）、可测试（插件自包含，测一个插件不用拉起整个 GUI）、可扩展（新功能 = 新目录 + `mod.rs`，不动内核）。

下一幕去看最折腾的部分：会话调度。那里有一个让我半夜爬起来改代码的 bug，模型每轮对话都在切换上下文，而凶手就是它自己留在上下文里的一条工具调用记录。
