---
title: 流量分析
order: 5
icon: mdi:wifi-arrow-left-right
category:
  - CTF
  - 手册
  - Misc
---

流量分析题给你一个网络抓包文件（`.pcap` 或 `.pcapng`），要求从中找出 Flag 或还原攻击过程。

## Wireshark 基础

```bash
wireshark capture.pcapng
```

### 常用过滤器

```
# 协议过滤
http
ftp
dns
tcp
udp
icmp

# 地址过滤
ip.addr == 192.168.1.1
ip.src == 10.0.0.1
ip.dst == 10.0.0.2

# 端口过滤
tcp.port == 80
tcp.dstport == 443

# 内容搜索
frame contains "flag"
http contains "password"

# 组合过滤
http && ip.src == 192.168.1.100
tcp.port == 80 || tcp.port == 443
```

### 常用操作

| 操作 | 方法 |
|------|------|
| 追踪 TCP 流 | 右键包 → 追踪流 → TCP 流 |
| 追踪 HTTP 流 | 右键包 → 追踪流 → HTTP 流 |
| 导出 HTTP 文件 | 文件 → 导出对象 → HTTP |
| 导出 FTP 文件 | 文件 → 导出对象 → FTP-DATA |
| 查看统计 | 统计 → 协议分级 |

## HTTP 流量分析

```
# 过滤 POST 请求（常含密码/Flag）
http.request.method == "POST"

# 过滤特定路径
http.request.uri contains "flag"
http.request.uri contains "upload"

# 查看响应内容
http.response.code == 200
```

**导出传输的文件**：文件 → 导出对象 → HTTP，可以把所有 HTTP 传输的文件（图片、脚本、压缩包）一次性导出。

## FTP 流量分析

FTP 明文传输，直接能看到用户名、密码和文件内容：

```
# 过滤 FTP 命令
ftp

# 过滤 FTP 数据传输
ftp-data

# 追踪 FTP 数据流，导出文件
右键 ftp-data 包 → 追踪流 → TCP 流 → 另存为
```

## DNS 隐写

Flag 可能被编码在 DNS 查询的域名里：

```
# 过滤 DNS 查询
dns

# 查看查询的域名
dns.qry.name
```

常见形式：`ZmxhZ3s...}.attacker.com`（base64 编码的 Flag 作为子域名）

```python
import pyshark

cap = pyshark.FileCapture('capture.pcap', display_filter='dns')
for pkt in cap:
    if hasattr(pkt.dns, 'qry_name'):
        print(pkt.dns.qry_name)
```

## USB 键盘流量

USB HID 协议记录了键盘的每次按键，可以还原出输入的内容。

```
# 过滤 USB HID 数据
usb.transfer_type == 0x01
```

```python
# 提取键盘数据并还原击键
import pyshark

# HID 键码表（部分）
KEY_MAP = {
    0x04: 'a', 0x05: 'b', 0x06: 'c', 0x07: 'd', 0x08: 'e',
    0x09: 'f', 0x0a: 'g', 0x0b: 'h', 0x0c: 'i', 0x0d: 'j',
    0x0e: 'k', 0x0f: 'l', 0x10: 'm', 0x11: 'n', 0x12: 'o',
    0x13: 'p', 0x14: 'q', 0x15: 'r', 0x16: 's', 0x17: 't',
    0x18: 'u', 0x19: 'v', 0x1a: 'w', 0x1b: 'x', 0x1c: 'y',
    0x1d: 'z', 0x27: '0', 0x1e: '1', 0x1f: '2', 0x20: '3',
    0x28: '\n', 0x2c: ' ', 0x2a: '[DEL]',
}

cap = pyshark.FileCapture('usb.pcap', display_filter='usb.transfer_type==0x01')
result = ''
for pkt in cap:
    try:
        data = bytes.fromhex(pkt.usb.capdata.replace(':', ''))
        if len(data) >= 3 and data[2] != 0:
            key = KEY_MAP.get(data[2], f'[{data[2]:02x}]')
            result += key
    except:
        pass
print(result)
```

## tshark 命令行工具

```bash
# 提取所有 HTTP 请求 URL
tshark -r capture.pcap -Y http.request -T fields -e http.host -e http.request.uri

# 提取所有 DNS 查询
tshark -r capture.pcap -Y dns.flags.response==0 -T fields -e dns.qry.name

# 导出特定流的数据
tshark -r capture.pcap -q -z follow,tcp,ascii,0
```

## 练手资源

- CTFHub 流量分析技能树
- 攻防世界 Misc 流量分析题
