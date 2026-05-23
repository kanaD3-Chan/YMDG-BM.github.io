---
title: 密码学
order: 6
dir:
  order: 6
  link: true
index: true
icon: mdi:key-variant
category:
  - CTF
  - 手册
  - Crypto
---

CTF 密码学的核心是找漏洞——不是破解算法本身，而是找参数选择或实现上的缺陷。

听起来很难，但大多数 CTF 密码题都有固定套路：认出题型，套上对应的攻击脚本，就能解出来。真正需要数学推导的题目，在入门阶段遇到的不多。

本章覆盖古典密码、RSA 常见攻击、对称加密（AES）、哈希攻击、流密码、椭圆曲线，以及数论基础和杂项编码识别。SageMath 和 pycryptodome 是这个方向最常用的工具，建议提前装好。

::: tip
拿到一道 Crypto 题，先看看是不是古典密码或编码问题——这类题不需要任何数学，CyberChef 直接解。
:::

## 本章内容

<Catalog />
