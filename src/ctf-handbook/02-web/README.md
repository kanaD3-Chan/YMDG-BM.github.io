---
title: Web 安全
order: 3
dir:
  order: 3
  link: true
index: true
icon: ri:earth-fill
category:
  - CTF
  - 手册
  - Web
---

Web 安全是 CTF 中入门最快的方向，也是最贴近日常开发的赛道。你每天用的网站、填的表单、点的链接，背后都可能藏着漏洞。

本章覆盖 OWASP Top 10 中的主要漏洞类型：SQL 注入、文件上传、XSS、命令注入、文件包含、SSRF、XXE、反序列化、越权。每篇文章都有原理讲解和实际的攻击步骤，跟着做一遍比看十遍更有用。

工具方面，Burp Suite 是核心——几乎所有 Web 题都要用它抓包改包。第一次接触的话，先把 Burp 配好再说其他的。

::: tip
不要一开始就用工具一把梭。遇到漏洞，先弄清楚**代码为什么会出问题**。理解了原理，才能应对各种变种题目。
:::

## 本章内容

<Catalog />

---

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

在 ret2shell 训练场完成以下题目：

- [Ctrl+U](http://172.16.173.140/training/11?challenge=36) — 按下 Ctrl+U 查看网页源代码，flag 就在里面
- [爬虫不让去的地方](http://172.16.173.140/training/11?challenge=37) — 访问 robots.txt，看看爬虫不想让你看到什么
- [响应头里的秘密](http://172.16.173.140/training/11?challenge=38) — flag 不在页面上，在 HTTP 响应头里
