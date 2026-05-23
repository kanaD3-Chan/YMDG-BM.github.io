---
title: 二进制安全（Pwn）
order: 5
dir:
  order: 5
  link: true
index: true
icon: mdi:bug-outline
category:
  - CTF
  - 手册
  - Pwn
---

Pwn 是 CTF 中难度最高的方向，目标是通过程序的内存漏洞获取系统控制权——通常是拿到一个 shell。

入门慢是正常的。很多人在 Pwn 上卡了一两个月才开窍。但一旦开窍，那种感觉是其他方向给不了的。

本章从环境搭建开始，经过栈溢出、格式化字符串、ret2libc、ROP 进阶，一直到堆利用基础。每个知识点都依赖前一个，不建议跳着读。遇到卡壳的地方，多用 GDB 动态调试，看清楚内存里到底发生了什么。

::: warning
Pwn 的环境配置有一定门槛。如果你还没装好 pwntools 和 pwndbg，先去第一篇文章把环境搭起来，再回来继续。
:::

## 本章内容

<Catalog />
