---
title: 两次自我推翻
icon: mdi:cube-unfolded
order: 0
category:
  - Agent 开发
tag:
  - Rust
  - Agent
  - 架构
---

# 两次自我推翻

## 把 Agent core 抠出来

第五幕结尾说，下一步把 Agent core 从错题业务里抠出来，做成独立的 so-lite-agent。

做完了。过程中我推翻了自己两次，一次比一次彻底。

第一次推翻的是"单 crate"红线，mistake-agent v2 时代我亲笔写进架构红线的纪律。第二次推翻的是 crate 库这个形态本身：它还没来得及上 crates.io，就整个不要了。

## 第一次推翻：单 crate 红线

当时定这条红线是有道理的。v2 是单应用：单 crate 让能力边界靠两层纪律管住，内核实现藏进 `pub(crate)`，插件只能拿类型化的服务句柄；编译期就拦住"插件直接碰文件系统"这种越界。一个 crate 编译出一个二进制，直接支撑"双击即用"。

这条红线服务得很好，好到我以为它是天经地义。

天经地义的东西都是这样被推翻的：不是被论证倒，是被下一个目标弄死的。新目标是跨应用复用——把 Agent core 抽成独立 crate。抽离是大手术，单 crate 红线从"纪律"变成了"枷锁"：同一个仓库里，引擎演进和业务演进互相卡。于是 ADR 里正式 supersede 了自己：独立仓库，让 crate 边界物理强制。

## 剥离落地：M2 到 M4，快进

- M2：`so-lite-agent` 独立 crate 骨架。通用 registry / dispatch / loop / 会话存储 / RPC，`cargo run --example hello` 跑通 mock 回合；
- M3：Provider 层。openai / responses / anthropic 三个适配器加 `register_provider()`，本地 SSE 测试过，真实 API 验收：DeepSeek Responses 回合跑通；
- M4：通用 RPC：Method 子集 + `custom` 兜底 + `RpcExtension`；插件开发手册随 crate 走，复制即开工。

mistake-agent 时代的规矩沿用了下来：不 mock、不假装，验收点接真实 API。

## 影响源：DeepSeek Harness

然后 DeepSeek Harness 发布了。MIT 协议，公开可抄。它把一件事做成了答案：一切皆插件。能力可替换，agent loop 本身也是插件；事件是扩展点；组合发生在运行时。

我把它的设计从头读了一遍，对照自己的 crate，找到四条差距：能力三角（Service Definition / Provider / Consumer）有雏形但没形式化；loop 焊死在 Kernel 里，想换一个就得改内核；事件只做播报，没有拦截语义；装配是编译期的代码链。

它没在逼谁，没人逼我。它只是把一面镜子举到我面前：我以为快走到终点的形态，其实是个中间态。受它影响，我决定转向。

## 第二次推翻：crate 库不要了

crate 库的设想是：第三方 `cargo add so-lite-agent`，十行代码跑通 hello 回合。M2 到 M4 全按这个方向做的。但镜子照完之后我承认了一件事：库形态假设"使用方自己写二进制"，而一个业务无关的 Agent 运行时，最该有的形态是开箱即用的可执行文件。

于是 pivot：定位从 crate 库转为通用 Agent 可执行文件，`sl-agent` 二进制，HTTP/WS API 服务，配一个 React 参考前端。用户插件改用 **Rune 脚本**：安全 VM + `requires` 函数白名单，脚本只能经宿主函数触达外部世界，声明什么拿什么，明文篡改也作不了白名单外的恶。Rust 插件路径保留，留给高级场景。仓库 workspace 化：引擎 crate、官方二进制、内核插件 crate 分开，最终编译成一个二进制。

crates.io 上架正式作废。项目都变成可执行文件了，还发什么库。

## 底座备好了

两次推翻，是同一个逻辑：内核必须为下一个 Agent 准备，而不是为上一个 Agent 陪葬。单 crate 红线服务的是 mistake-agent；crate 库形态服务的是"别人会来用"的想象；最后落到可执行 harness，服务的是"下一个 Agent 真的落地"。

iot-agent 就是那个下一个。一个毕设，fork 定制者身份，submodule 钉版本集成内核，内核插件用 Rust、用户插件写 Rune，去指挥宿舍里的真实设备。

真正的挑战从那里开始。去[在"错误"之外](../iot-agent/README.md)看。

仓库：[kanaD3-Chan/so-lite-agent](https://github.com/kanaD3-Chan/so-lite-agent)
