---
title: 应急响应基础
order: 7
icon: mdi:alarm-light-outline
category:
  - CTF
  - 手册
  - Misc
---

应急响应（Incident Response）是指发现系统被入侵后，快速排查攻击痕迹、找出攻击者留下的后门和 Flag 的过程。在 CTF 中，应急响应题通常给你一个已被攻击的系统镜像或 SSH 访问权限。

## 应急响应思路

```
发现异常
  → 确认入侵（查日志、进程、文件）
  → 找攻击入口（Web 日志、SSH 日志）
  → 找恶意文件（WebShell、后门）
  → 找 Flag（通常藏在攻击者留下的文件里）
  → 清除后门
```

## 系统排查

### 可疑进程

```bash
# 查看所有进程
ps aux
ps -ef

# 查看进程的网络连接
netstat -antp
ss -antp

# 找占用 CPU/内存异常的进程
top
htop

# 查看进程对应的文件（找到恶意程序路径）
ls -la /proc/PID/exe
cat /proc/PID/cmdline
```

### 可疑用户

```bash
# 查看所有用户
cat /etc/passwd

# 查看有 shell 的用户（可登录的）
grep -v '/nologin\|/false' /etc/passwd

# 查看 sudo 权限
cat /etc/sudoers
cat /etc/sudoers.d/*

# 查看最近登录记录
last
lastlog
who
w
```

### 可疑文件

```bash
# 查找最近修改的文件（24小时内）
find / -mtime -1 -type f 2>/dev/null

# 查找 SUID 文件（可能被攻击者利用提权）
find / -perm -4000 -type f 2>/dev/null

# 查找隐藏文件
find / -name ".*" -type f 2>/dev/null

# 查找 WebShell（PHP 文件中含有 eval/system/exec）
find /var/www -name "*.php" | xargs grep -l "eval\|system\|exec\|passthru" 2>/dev/null
```

### 计划任务（持久化后门）

```bash
# 查看 crontab
crontab -l
crontab -l -u root
cat /etc/crontab
ls /etc/cron.*

# 查看 systemd 服务
systemctl list-units --type=service
ls /etc/systemd/system/
```

## Web 日志分析

### Apache/Nginx 日志

```bash
# 日志位置
/var/log/apache2/access.log
/var/log/nginx/access.log

# 找 POST 请求（WebShell 通常用 POST）
grep "POST" access.log

# 找可疑的 URL（包含 eval、system、cmd 等）
grep -E "eval|system|cmd|exec|passthru" access.log

# 找状态码 200 的 PHP 文件访问
grep "\.php" access.log | grep " 200 "

# 统计访问最多的 IP（可能是攻击者）
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -20

# 找上传操作
grep "upload\|Upload" access.log
```

### SSH 日志

```bash
# 查看 SSH 登录记录
cat /var/log/auth.log | grep "Accepted"

# 查看 SSH 失败记录（暴力破解）
cat /var/log/auth.log | grep "Failed"

# 统计失败登录的 IP
grep "Failed password" /var/log/auth.log | awk '{print $11}' | sort | uniq -c | sort -rn
```

## 常见后门排查

### SSH 后门

```bash
# 查看 authorized_keys（攻击者可能添加了自己的公钥）
cat ~/.ssh/authorized_keys
cat /root/.ssh/authorized_keys

# 查看 SSH 配置（是否允许 root 登录、是否改了端口）
cat /etc/ssh/sshd_config
```

### 环境变量后门

```bash
# 查看 .bashrc、.profile 等启动文件
cat ~/.bashrc
cat ~/.profile
cat /etc/profile
cat /etc/bash.bashrc
```

### 动态链接库劫持

```bash
# 查看 LD_PRELOAD 环境变量
env | grep LD_PRELOAD

# 查看 /etc/ld.so.preload
cat /etc/ld.so.preload
```

## 内存马排查

内存马是无文件 WebShell，只存在于内存中，重启后消失。

```bash
# Java 内存马：查看 JVM 加载的类
# 使用 arthas 工具
java -jar arthas-boot.jar
# 进入后：sc *.Filter 查看所有 Filter 类

# PHP 内存马：通常通过 eval 注入，查看 PHP 进程内存
cat /proc/PHP_PID/maps | grep heap
```

## 练手资源

- CTFHub 应急响应技能树
- 攻防世界 Misc 应急响应题
- 蓝队靶场（各大安全厂商提供的应急响应演练平台）
