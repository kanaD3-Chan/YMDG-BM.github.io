---
title: 第三幕 双模型与真实 API 优先
icon: mdi:database-sync-outline
order: 3
category:
  - Agent 开发
tag:
  - Rust
  - Agent
  - DeepSeek
  - SiliconFlow
---

# 第三幕 双模型与真实 API 优先

## 一个 Agent，两个模型

错题 Agent 有两件事要做：看懂作业图片，和像老师一样批改讲解。它们不是同一个模型擅长的，所以项目从第一天就是双模型：

| 角色 | 模型 | 通道 |
|---|---|---|
| 主模型（对话/调度/判分） | deepseek-v4-flash | DeepSeek Responses API |
| 视觉模型（OCR/图片理解） | Qwen/Qwen3-VL-32B-Instruct | SiliconFlow Chat Completions |

这一幕讲模型层踩过的协议坑、重试哲学，以及余额和缓存命中率这两个我拿真钱测出来的数字。

## 两种 API：Chat Completions 与 Responses

大多数人接触大模型 API 是从 Chat Completions 开始的：你把 `messages` 发过去，它把 `content` 还给你。但 Agent 需要的不只是"聊天"，还有思考过程、工具调用、结构化输出这些显式的东西。

Responses API 是面向 Agent 的响应式接口，返回结构化事件流：

```
event: reasoning     # 思考过程（可隐藏展示）
event: function_call # "我要调用 grading_upload，参数是..."
event: output_text   # 最终回答
event: response.completed  # 结束，附带 usage
```

无状态，每回合把全量历史发过去；函数名只允许 `[a-zA-Z0-9_-]`（所以 `grading::upload` 要映射成 `grading_upload`）；思考模式下不允许 `tool_choice`，强制调用工具时整回合要关思考。更坑的是，思考内容必须原样回传：协议里带 `id` 的 reasoning item，下一轮如果不带回去，API 直接报错。这些都是文档不会替你踩的坑。

视觉模型为什么必须走 Chat Completions？因为 Responses API 不支持图片输入。qwen3-VL 走的是 OpenAI 兼容的 `image_url`，base64 直接塞进消息：

```json
{
  "role": "user",
  "content": [
    { "type": "image_url", "image_url": { "url": "data:image/png;base64,...", "detail": "high" } },
    { "type": "text", "text": "请逐字识别并转写这张图片中的题目与作答" }
  ]
}
```

OCR 的提示词有一条硬规矩：只提取内容，不判分。视觉模型负责逐字转写、保留题号和数学符号；判分是主模型的活。职责分开，谁也别越界。

## 真实 API 优先：不 mock，不假装

这个项目立了一条测试铁律：任何验收点，都直接接真实 API 跑。

不是不能用 mock，而是 Agent 项目的 mock 有个致命问题：你 mock 的是"你认为 API 应该长什么样"。真实 API 的脾气（usage 字段在哪、SSE 有没有 `[DONE]`、思考 item 要不要回传）只有真打一遍才知道。

所以测试分两层：

- 逻辑测试：调度、注册表、消息树这些纯逻辑，本地秒跑；
- 真实链路测试：带 `ignored` 标记，用 `settings.json` 里的真实 key 跑。hello 回合要"消息真的落盘 + usage 真的解析进审计"才算过；批改要三套样例端到端（真实照片的线代填空、合成数学卷、合成英语卷），OCR → 判分 → 错题归档一条龙。

跑真实链路意味着会花钱、会慢、会偶发失败。但换来的是：凡是标"通过"的东西，都是用户真的能用起来的东西。

## 瞬时的重试，系统性的撂挑子

模型 API 报错分两种，处理方式完全相反：

| 错误类型 | 例子 | 策略 |
|---|---|---|
| 瞬时错误 | HTTP 503、限流、超时 | 指数退避重试（默认 2 次） |
| 系统性错误 | 鉴权失败、余额不足、模型下架 | 不重试，直接失败 |

系统性错误重试只会浪费钱和时间：余额不足，重试一万次也不会凭空有钱。这条哲学从模型层一路贯彻到工具层，工具错误带 `retryable` 标记，loop 据此决定"改参数再试"还是"直接告诉用户"。

用户还补了一条更细的要求：临时错误先重试；如果是 API 方的问题（模型下架/没余额），就直接撂挑子不干。于是实现里 503 一定重试，鉴权失败一定秒失败，绝不含糊。

## 余额查询

模型跑多了就会关心钱。两个提供商都有余额接口。

DeepSeek：

```json
{
  "is_available": true,
  "balance_infos": [
    { "currency": "CNY", "total_balance": "5.19", "granted_balance": "0.00", "topped_up_balance": "5.19" }
  ]
}
```

SiliconFlow 的字段是三个，这里有个坑：

```json
{
  "data": {
    "balance": "13.2656",       // 赠送余额
    "chargeBalance": "9.7617",  // 充值余额 ← 真正可用的
    "totalBalance": "23.0274"   // 总额
  }
}
```

一开始我把 `balance`（13.26）当主余额展示，用户看了一眼说："9.7617 才是真实可用的余额。"查文档才确认：SiliconFlow 的 `balance` 是赠送余额（不可提现、不可转让），`chargeBalance` 才是充值花出去的真金白银。这个教训的通用版本是：API 字段名是商家定义的，语义要按商家的规则理解，别拿直觉猜。

## 缓存命中率

Responses API 的 usage 里有个容易被忽略的字段：

```json
{
  "input_tokens": 5054,
  "input_tokens_details": { "cached_tokens": 4864 },
  "output_tokens": 190
}
```

`cached_tokens` 表示这次请求有多少输入命中了服务端上下文缓存，命中部分价格只有未命中的十分之一。SiliconFlow 那边对应 `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens`。

我给聊天页加了一个实时指标"上下文缓存命中率"，两个实现细节值得说。

第一，统计口径要干净：只统计 agent loop 的回合调用，按"当前会话 + 全局"聚合。预决策、摘要这种小调用混进来会稀释数字，不算。

第二，推送时序有坑。最初是回合结束事件触发前端回查，结果前端每次读到的都是上一轮的数，因为 `turn_end` 事件在 usage 落盘之前就发出去了。改成后端落盘后主动推 `cache_stats_updated` 事件（带上最新快照），前端收到即更新，这才叫实时。

实测：hello 回合命中 4864 / 未命中 190，约 96%；两轮对话后 97.3%。上下文越稳定，缓存命中率越高，这个数字现在是我判断会话有没有在良性复用的第一眼指标。

## 收个尾

双模型分工：主模型走 Responses（思考/工具/结构化），视觉模型走 Chat Completions（图片）。真实 API 优先：mock 是"你以为的 API"，真打一遍才知道 API 的脾气。重试哲学：瞬时错误重试，系统性错误撂挑子。语义按商家的规则理解：赠送余额不是可用余额。指标要实时且口径干净：缓存命中率只算回合调用，落盘后推送。

下一幕讲这个项目的另一半：给中学生的 UI。为什么"简化版"是错的、首次引导向导、显式工具调用，以及 Markdown 和 LaTeX 背后的安全攻防。
