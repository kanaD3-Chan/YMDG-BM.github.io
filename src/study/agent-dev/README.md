---
title: Agent 开发
index: true
icon: mdi:robot-outline
order: 9
dir:
  link: true
  order: 9
category:
  - Agent 开发
---

从给中学生做一个错题 Agent，到把内核抽成通用框架，再到用它指挥宿舍里的真实设备——Agent 开发的全过程，按三个项目分章：

- **Mistake Agent**：错题 Agent 本体，从 LangChain 到自研内核的全部幕次
- **从专有内核到可扩展架构**：内核从业务里剥出来，长成独立的 so-lite-agent
- **在"错误"之外**：iot-agent，一个用真实设备做毕设的 Agent（仓库暂未公开）

::: warning AIGC 警告
本部分内容包含大量 AIGC 内容：项目是 vibe coding 的产物，文章也由 AI 协助整理与撰写，请结合自己的判断阅读。
:::

::: important
此分区主要基于 KanaDE 本人开发过程中的总结与理解，**不保证完全正确**。由于运行环境、软件版本、系统差异等客观因素，若遇到报错，请自行：

- [STFW](https://bing.com) – 搜索引擎永远是最好的老师
- [RTFM](https://baike.baidu.com/item/RTFM/3961783) – 官方手册是最可靠的参考
- [ATFA](https://chat.deepseek.com) – 问那个该死的 AI 也行 😉

:::

<Catalog />
