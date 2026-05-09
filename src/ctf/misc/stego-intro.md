---
title: 隐写术入门——藏在像素与字节之间的秘密
order: 1
category:
  - CTF
  - Misc
icon: codicon:symbol-misc
---

隐写术就是把信息藏在另一个文件里，让人看不出来。一张普通的风景照里可能藏着一段文字，一个压缩包里可能塞着另一个文件。

<!-- more -->

## 文件分析：先弄清楚你面对的是什么

拿到一个文件，不要急着用工具，先确认它的真实类型。

```bash
file unknown.jpg    # 查看文件类型
```

如果 `file` 说它是 ZIP 但其实后缀是 png——那可能只是有人改了后缀名。先改回来。

### 十六进制编辑——看文件的"骨头"

```bash
xxd unknown.bin | head -5
```

每个文件类型都有独特的**文件头（Magic Number）**：

| 文件类型 | 文件头 (hex) |
|---|---|
| PNG | `89 50 4E 47` |
| ZIP | `50 4B 03 04` |
| JPEG | `FF D8 FF` |
| GIF | `47 49 46 38` (GIF8) |
| PDF | `25 50 44 46` (%PDF) |
| RAR | `52 61 72 21` (Rar!) |

**文件尾也同样重要**：PNG 以 `49 45 4E 44` (IEND) 结尾，ZIP 以 `50 4B 05 06` 结尾。文件尾之后如果还有数据——那里面就有东西。

### 分离隐藏文件

```bash
binwalk -e file.jpg     # 自动提取嵌套文件
foremost file.jpg       # 同上，老牌工具
```

如果 `binwalk` 发现 PNG 里面藏了个 ZIP，它会自动提取出来。

## 图片隐写

### LSB 隐写（最常考）

每个像素由 RGB 三个通道组成，每个通道 8 位（0-255）。LSB（Least Significant Bit）就是最低位——把这个位改了，人眼几乎看不出颜色变化。

攻击者把秘密信息编码到每个像素的最低 1-2 位中，图片看起来依然正常。

**工具**：
```bash
zsteg image.png       # 自动检测 PNG 的 LSB 隐写
steghide extract -sf image.jpg   # 提取 steghide 嵌入的数据
```

或者用 Python 自己写：

```python
from PIL import Image
img = Image.open('stego.png')
pixels = img.load()

bits = ''
for y in range(img.height):
    for x in range(img.width):
        r, g, b = pixels[x, y]
        bits += str(r & 1)  # 取红色的最低位

# 每 8 位转一个字符
flag = ''
for i in range(0, len(bits), 8):
    flag += chr(int(bits[i:i+8], 2))
print(flag)
```

### EXIF 信息

```bash
exiftool image.jpg
```

GPS 坐标、拍摄设备、拍摄时间——都可能藏着线索。OSINT 题经常用这个。

### 盲水印

两张几乎相同的图，差值的像素就是隐藏信息。

```bash
# 用 Python 对两张图做像素差
from PIL import Image
a, b = Image.open('1.png'), Image.open('2.png')
result = Image.new('RGB', a.size)
for x in range(a.width):
    for y in range(a.height):
        diff = abs(a.getpixel((x,y))[0] - b.getpixel((x,y))[0])
        result.putpixel((x,y), (diff*20, diff*20, diff*20))
result.show()
```

## 压缩包分析

### 伪加密

ZIP 文件有两个位置记录加密状态：文件头和文件目录区。有些 ZIP 文件只改了一个——这叫伪加密。用 010 Editor 把两个地方的加密标志位都改成 `00`（未加密）就行。

### CRC32 碰撞

如果压缩包里的文件很小（4 字节以下），可以通过 CRC32 值反推出文件内容。这是 Misc 经典题型。

```python
import zipfile
import itertools
import string

with zipfile.ZipFile('challenge.zip') as z:
    for info in z.infolist():
        if info.file_size <= 4:   # 小文件，可以爆
            crc_target = info.CRC
            for combo in itertools.product(string.printable, repeat=info.file_size):
                data = ''.join(combo).encode()
                if zipfile.crc32(data) == crc_target:
                    print(f"{info.filename}: {data}")
                    break
```

## 流量分析（Wireshark）

```
wireshark capture.pcapng
```

在 Wireshark 里最常用三招：
- **过滤 HTTP**：`http`，然后 `文件 → 导出对象 → HTTP` 把传输的文件全部导出
- **跟踪 TCP 流**：右键某个包 → 追踪流 → TCP流，看整段对话
- **USB 键盘流量**：HID 协议的 USB 包记录了按键数据，可以还原成键击记录

## 你的工具包

新手建议先装好这些，放到一个 `misc-tools/` 文件夹里：

```
010 Editor / WinHex   — 十六进制编辑
Wireshark             — 流量分析
binwalk / foremost    — 文件分离
zsteg / steghide      — 图片隐写
exiftool              — EXIF 查看
CyberChef (网页版)    — 编码转换万金油
```

Python 是必须会的——很多题目工具覆盖不了，需要自己写脚本。

## 一句话

Misc 的题目千奇百怪，唯一的规律就是**多看、多试、多积累**。每做一道题，把思路记下来，把脚本存起来，下次碰到类似的直接复用。
