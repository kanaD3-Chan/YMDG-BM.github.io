---
title: 文件上传——从一张图片到WebShell
order: 2
category:
  - CTF
  - Web
icon: material-symbols:upload-file
---

文件上传漏洞就是：网站让你传文件，结果你没传图片，传了个能执行命令的脚本上去。

<!-- more -->

## 原理

正常的上传流程应该检查：文件类型、文件大小、文件内容。但只要有一个检查没做好，你就能传一个 WebShell 上去。

WebShell 就是一段能在服务器上执行系统命令的代码。PHP 版本的 WebShell 可以短到只有一行：

```php
<?php @eval($_POST['cmd']); ?>
```

传上去之后，用蚁剑或浏览器 POST 请求连上去，就能在服务器上执行任意命令了。

## 最基本的绕过套路

### 1. 前端 JS 检查（白给）

网站只在浏览器端用 JS 检查文件后缀，后端啥也不查。

**绕过**：用 Burp Suite 抓包，在请求里直接把 `.jpg` 改成 `.php`，重放。

### 2. MIME 类型检查

后端只检查了 `Content-Type: image/jpeg`，没查文件实际内容。

**绕过**：Burp 抓包，把 `Content-Type` 改成 `image/jpeg`（或 `image/png`、`image/gif`），文件内容保持不变。

### 3. 黑名单过滤（最常见的考点）

网站禁止了 `.php`、`.phtml` 等后缀，但总有漏网之鱼。

**各种能解析 PHP 的后缀名**：

```text
.php  .php3  .php4  .php5  .phtml  .pht  .phar  .shtml
```

不同服务器的配置不同，需要挨个试。Apache 下 `.phtml` 和 `.php5` 经常被遗漏。

另外还有大小写绕过：`.Php`、`.PHP`、`.pHp`——Windows 服务器不区分大小写时有效。

### 4. 文件内容检查

后端检查了文件开头的魔术数字（magic number），确保是"真的"图片。

**绕过**：在 WebShell 代码前面加上图片的文件头：

```php
GIF89a
<?php @eval($_POST['cmd']); ?>
```

`GIF89a` 是 GIF 文件的魔术数字。后端读到它，以为这是张 GIF 图，就放行了。但实际上 Apache 会把它当 PHP 执行（因为后缀是 `.php` 或能解析 PHP 的配置）。

### 5. 条件竞争

后端先把文件存到临时目录，再检查——检查不通过就删除。

**利用**：在上传后、被删除前的极短窗口期，用脚本疯狂请求这个文件。只要有一次请求落在窗口期中，WebShell 就执行成功了。

实战中通常用 Python 多线程或 Burp Intruder 来实现。

### 6. 文件包含 + 图片马

如果网站有文件包含漏洞（`?page=xxx`），即使你传了后缀是 `.jpg` 的 WebShell，也可以通过包含来执行它：

```php
?page=uploads/shell.jpg
```

PHP 的 `include()` 会把文件内容当 PHP 代码执行，不管后缀名是什么。

## .htaccess 与 .user.ini

这两个文件能改变 PHP 的执行行为。如果你的 WebShell 被卡在后缀上，可以试试先传一个配置文件。

**.htaccess**（Apache）：

```htaccess
AddType application/x-httpd-php .jpg
```

上传后，服务器会把 `.jpg` 文件也当 PHP 执行。

**.user.ini**（Nginx/FastCGI）：

```ini
auto_prepend_file=shell.jpg
```

上传后，所有 PHP 页面执行前都会先包含 `shell.jpg`。

## 练手推荐

- [Upload-labs](https://github.com/c0ny1/upload-labs) — 21 关文件上传靶场，从基础到高级全覆盖
- CTFHub 的文件上传关 — 与 SQL 注入配套的入门练习

## 一句话总结

文件上传的攻防就是猫鼠游戏——后端加规则，你来绕过它。学完这一课，你应该能应付大多数 CTF 新生赛的上传题了。
