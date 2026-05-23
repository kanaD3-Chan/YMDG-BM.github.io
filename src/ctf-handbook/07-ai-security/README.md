---
title: AI 安全
order: 8
dir:
  order: 8
  link: true
index: true
icon: mdi:robot-outline
category:
  - CTF
  - 手册
  - AI安全
---

AI 安全是 CTF 中最新的方向，随着大语言模型的普及，针对 AI 系统的攻击也开始出现在比赛题目里。

这个方向分两类：一类是针对 LLM 应用的攻击（Prompt Injection、越狱），不需要机器学习基础，会写 Prompt 就能上手；另一类是针对传统机器学习模型的攻击（对抗样本、后门检测、模型提取），需要一点 PyTorch 基础。

本章覆盖 Prompt Injection、越狱技术、LLM 应用安全、对抗样本、模型后门与提取、多模态攻击，以及联邦学习中的隐私攻击。最后一篇是 AI CTF 题型总结，建议在读完其他文章后再看。

::: tip
AI 安全是一个快速发展的领域。本章内容以 CTF 实战为导向，建议结合最新的比赛 Writeup 一起学习。
:::

## 本章内容

<Catalog />
