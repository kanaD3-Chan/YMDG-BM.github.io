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

当大语言模型开始替我们调用工具、记住上下文、在恰当的时候切换话题，"程序"这个词的边界就模糊了。

这里记录的是我们团队亲手搭建一个 Agent 的过程——从 LangChain 到自研内核，从 Web 到本地桌面，从"框架替我决策"到"我自己就是骨架"。有设计、有踩坑、有推倒重来的夜晚，也有终于跑通真实链路时的那一声"成了"。

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
