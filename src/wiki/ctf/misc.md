---
title: 杂项工具与技法
icon: codicon:symbol-misc
order: 5
category:
  - Wiki
  - CTF
---

Misc 没有固定套路，但有固定工具包。本页覆盖文件分析、隐写术、流量分析和取证的常用方法。

<!-- more -->

## 文件分析

### 第一步：确认文件类型

```bash
file unknown.bin       # 报告真实类型
xxd unknown.bin | head # 看文件头 hex
```

### 常见文件魔术数字

| 类型 | Hex | ASCII |
|---|---|---|
| PNG | `89 50 4E 47 0D 0A 1A 0A` | `.PNG....` |
| JPEG | `FF D8 FF` | `ÿØÿ` |
| GIF | `47 49 46 38` | `GIF8` |
| ZIP | `50 4B 03 04` | `PK..` |
| PDF | `25 50 44 46` | `%PDF` |
| RAR | `52 61 72 21` | `Rar!` |
| 7z | `37 7A BC AF 27 1C` | `7z¼¯'.` |
| ELF | `7F 45 4C 46` | `.ELF` |
| WAV | `52 49 46 46` | `RIFF` |

### 嵌套文件分离

```bash
binwalk -Me file.jpg     # 自动提取嵌套文件
foremost file.jpg        # 老牌文件分离工具
dd if=file.bin of=hidden.zip bs=1 skip=OFFSET  # 手动提取
```

### ZIP 伪加密修复

用 010 Editor 打开 → 搜索 `50 4B 01 02`（目录区）和 `50 4B 03 04`（文件头），将加密标志位（偏移 +6 和 +8）的 `09 00` 改为 `00 00`。

### CRC32 碰撞（小文件）

```python
import zipfile, itertools, string

with zipfile.ZipFile('challenge.zip') as z:
    for info in z.infolist():
        if info.file_size <= 4:
            for combo in itertools.product(string.printable,
                                           repeat=info.file_size):
                data = ''.join(combo).encode()
                if zipfile.crc32(data) == info.CRC:
                    print(f"{info.filename}: {data}")
```

## 隐写术

### 图片隐写

| 工具 | 用途 |
|---|---|
| `zsteg image.png` | PNG LSB 自动检测 |
| `steghide extract -sf image.jpg` | steghide 嵌入数据提取 |
| `exiftool image.jpg` | 查看 EXIF/GPS 元数据 |
| `stegsolve` | GUI 逐通道/逐 bit-plane 分析 |
| `identify -verbose image.png` | ImageMagick 详细信息 |

### LSB 手动提取

```python
from PIL import Image
img = Image.open('stego.png')
pixels = img.load()

bits = ''
for y in range(img.height):
    for x in range(img.width):
        r, g, b = pixels[x, y]
        bits += str(r & 1)   # R 通道最低位

# 每 8 bit → 1 字符
flag = ''.join(chr(int(bits[i:i+8], 2))
               for i in range(0, len(bits), 8))
```

### 盲水印

两张几乎相同的图 → 做像素差值提取。

```python
from PIL import Image
a = Image.open('1.png')
b = Image.open('2.png')
for x in range(a.width):
    for y in range(a.height):
        diff = abs(a.getpixel((x,y))[0] - b.getpixel((x,y))[0])
        result.putpixel((x,y), (diff*20,)*3)  # 放大差异
result.show()
```

### 音频/频谱图

用 Audacity 打开 → 切换到频谱图（Spectrogram）视图。Flag 经常直接写在频谱图里。

## 流量分析（Wireshark）

### 核心操作

| 操作 | 方法 |
|---|---|
| 过滤 HTTP | 过滤器输入 `http` |
| 导出 HTTP 文件 | `文件 → 导出对象 → HTTP` |
| 追踪 TCP 流 | 右键某包 → 追踪流 → TCP |
| 过滤 IP | `ip.addr == 192.168.1.1` |
| 过滤端口 | `tcp.port == 80` |
| 过滤 DNS | `dns` |

### USB 键盘流量

USB HID 协议的键盘流量包含了击键记录。提取 USB 数据后用脚本还原：

```python
# 思路：提取 urb → 找 HID Data 中的按键码
# mapping = {0x04:'a', 0x05:'b', ...}  # HID 键码表
# 注意 Shift 修饰键（0x02=左Shift）
```

### 常用过滤语法

```
http.request.method == "POST"
dns.qry.name contains "flag"
ftp-data
tcp contains "password"
frame contains "PK"         # ZIP 文件传输
```

## 内存取证

### Volatility 基础命令

```bash
volatility -f memory.dump imageinfo           # 识别系统版本
volatility -f memory.dump --profile=XXX pslist  # 进程列表
volatility -f memory.dump --profile=XXX cmdline # 命令行参数
volatility -f memory.dump --profile=XXX filescan | grep flag
volatility -f memory.dump --profile=XXX dumpfiles -Q OFFSET -D out/
volatility -f memory.dump --profile=XXX hivelist # 注册表
volatility -f memory.dump --profile=XXX hashdump  # 密码哈希
```

## Misc 工具包清单

```
必备：
  010 Editor / WinHex     — 十六进制编辑
  Wireshark               — 流量分析
  Python3                 — 写脚本（必须熟练）
  CyberChef (网页)        — 编码转换万金油

文件：
  binwalk / foremost      — 文件分离
  file / xxd / strings    — 文件分析

图片：
  zsteg / steghide        — 隐写检测
  exiftool / stegsolve    — EXIF/通道分析
  PIL / Pillow            — Python 图片处理

压缩包：
  010 Editor              — 伪加密修复
  fcrackzip               — ZIP 爆破

音频：
  Audacity                — 频谱图分析

内存：
  Volatility              — 内存取证
```

## 交叉引用

- [Web安全速查](./web.md) — 流量分析中常见的 HTTP 攻击
- [逆向工程参考](./reverse.md) — 固件分析中经常需要先逆文件系统
