---
title: 逆向工程
order: 4
dir:
  order: 4
  link: true
index: true
icon: mdi:magnify-scan
category:
  - CTF
  - 手册
  - Reverse
---

逆向就是把编译好的程序翻回人能看懂的逻辑。你拿到的是一坨二进制，目标是从中找出算法、拿到 Flag。

这个方向需要一点汇编基础和耐心。IDA Pro 的 F5 键能把汇编变成伪 C 代码，大大降低了门槛——但遇到加壳、混淆、反调试的题目，还是得一步步拆。

本章从汇编基础和 ELF/PE 文件结构讲起，到静态分析、动态调试，再到算法识别、反混淆、脚本语言逆向、Android 逆向和 Rust/Go 高级语言逆向。建议按顺序读，每个知识点都自己动手试一遍。

::: tip
理解逆向最快的方法：自己写一段 C 代码，编译，再用 IDA 分析。看看编译器把你的 `for` 循环变成了什么样子。
:::

## 本章内容

<Catalog />
