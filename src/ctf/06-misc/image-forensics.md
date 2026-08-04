---
title: 图像取证与隐写分析
order: 3
icon: mdi:image-search
category:
  - CTF
  - 手册
  - Misc
---

图像取证是 Misc 方向的核心内容，涵盖元数据分析、隐写检测和文件结构修复。

## 基础检查流程

```bash
# 1. 查看文件类型（不信任扩展名）
file suspicious.jpg
xxd suspicious.jpg | head -5   # 查看魔术字节

# 2. 查看元数据
exiftool suspicious.jpg

# 3. 检查文件末尾（常见附加数据）
xxd suspicious.jpg | tail -20
binwalk suspicious.jpg         # 检测嵌入文件

# 4. 字符串提取
strings suspicious.jpg | grep -i flag
```

## 常见图像格式与魔术字节

| 格式 | 魔术字节（十六进制） |
|------|---------------------|
| JPEG | `FF D8 FF` |
| PNG  | `89 50 4E 47 0D 0A 1A 0A` |
| GIF  | `47 49 46 38` (GIF8) |
| BMP  | `42 4D` |
| TIFF | `49 49 2A 00` 或 `4D 4D 00 2A` |
| WebP | `52 49 46 46 ... 57 45 42 50` |

## PNG 文件结构分析

PNG 由多个 chunk 组成，每个 chunk 格式：`[4字节长度][4字节类型][数据][4字节CRC]`

```python
import struct
import zlib

def parse_png_chunks(filename):
    with open(filename, 'rb') as f:
        signature = f.read(8)
        assert signature == b'\x89PNG\r\n\x1a\n'

        while True:
            length_bytes = f.read(4)
            if not length_bytes:
                break
            length = struct.unpack('>I', length_bytes)[0]
            chunk_type = f.read(4).decode('ascii', errors='replace')
            data = f.read(length)
            crc = f.read(4)

            print(f"Chunk: {chunk_type}, Length: {length}")

            # 检查 tEXt/zTXt chunk（可能藏有文本信息）
            if chunk_type == 'tEXt':
                print(f"  Text: {data}")
            elif chunk_type == 'zTXt':
                keyword, compressed = data.split(b'\x00', 1)
                text = zlib.decompress(compressed[1:])
                print(f"  Compressed text: {text}")

parse_png_chunks("suspicious.png")
```

### 修复损坏的 PNG

```python
# 常见问题：宽高被修改（导致图片显示不完整）
# 修复方法：重新计算正确的宽高

import struct
import zlib

def fix_png_dimensions(filename, output):
    with open(filename, 'rb') as f:
        data = bytearray(f.read())

    # IHDR chunk 在偏移 8 处，宽高在 IHDR 数据的前 8 字节
    # 格式：[8字节签名][4字节长度=13][4字节"IHDR"][4字节宽][4字节高]...
    width = struct.unpack('>I', data[16:20])[0]
    height = struct.unpack('>I', data[20:24])[0]
    print(f"当前尺寸：{width} x {height}")

    # 如果高度被改小，尝试增大
    # 修改后需要重新计算 IHDR 的 CRC
    new_height = height * 2  # 示例：尝试两倍高度
    data[20:24] = struct.pack('>I', new_height)

    # 重新计算 IHDR CRC
    ihdr_data = data[12:29]  # 类型 + 数据
    new_crc = zlib.crc32(ihdr_data) & 0xFFFFFFFF
    data[29:33] = struct.pack('>I', new_crc)

    with open(output, 'wb') as f:
        f.write(data)
```

## JPEG 隐写

### jsteg / outguess

```bash
# jsteg：在 JPEG DCT 系数的 LSB 中隐藏数据
# 检测：文件大小异常大
jsteg reveal suspicious.jpg output.txt

# outguess：更复杂的 JPEG 隐写
outguess -r suspicious.jpg output.txt
outguess -k "password" -r suspicious.jpg output.txt
```

### JPEG 注释段

```python
# JPEG 的 COM 段（0xFF 0xFE）可以包含任意文本
import struct

def extract_jpeg_comments(filename):
    with open(filename, 'rb') as f:
        data = f.read()

    i = 0
    while i < len(data) - 1:
        if data[i] == 0xFF and data[i+1] == 0xFE:
            length = struct.unpack('>H', data[i+2:i+4])[0]
            comment = data[i+4:i+2+length]
            print(f"Comment: {comment}")
        i += 1
```

## 颜色通道分析

```python
from PIL import Image
import numpy as np

img = np.array(Image.open("suspicious.png"))

# 分离 RGB 通道
r, g, b = img[:,:,0], img[:,:,1], img[:,:,2]

# 查看各通道的 LSB
r_lsb = r & 1
g_lsb = g & 1
b_lsb = b & 1

# 将 LSB 可视化（0→黑，1→白）
Image.fromarray((r_lsb * 255).astype(np.uint8)).save("r_lsb.png")
Image.fromarray((g_lsb * 255).astype(np.uint8)).save("g_lsb.png")
Image.fromarray((b_lsb * 255).astype(np.uint8)).save("b_lsb.png")

# 提取 LSB 数据
def extract_lsb(channel, bits=1):
    flat = channel.flatten()
    binary = ''.join(str(p & ((1 << bits) - 1)) for p in flat)
    # 每8位转字符
    chars = []
    for i in range(0, len(binary) - 7, 8):
        byte = int(binary[i:i+8], 2)
        if byte == 0:
            break
        chars.append(chr(byte))
    return ''.join(chars)

print(extract_lsb(r))
```

## 频域分析

```python
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt

# 对图像做 FFT，查看频域是否有异常
img = np.array(Image.open("suspicious.png").convert('L'))
fft = np.fft.fft2(img)
fft_shift = np.fft.fftshift(fft)
magnitude = np.log(np.abs(fft_shift) + 1)

plt.imshow(magnitude, cmap='gray')
plt.savefig("fft_result.png")
```

## 工具速查

```bash
# 综合分析
stegsolve          # Java 工具，可切换颜色通道、位平面
zsteg image.png    # 自动检测 PNG/BMP 中的 LSB 隐写
steghide extract -sf image.jpg -p password  # 提取 steghide 隐写

# 元数据
exiftool image.jpg
identify -verbose image.png  # ImageMagick

# 文件结构
pngcheck image.png  # 检查 PNG 完整性
jpeginfo image.jpg  # 检查 JPEG 完整性
```

## 练手资源

- CTFHub Misc 图片隐写系列
- 攻防世界 Misc 图像题
- [Stego Tricks](https://book.hacktricks.xyz/crypto-and-stego/stego-tricks) — 隐写技巧汇总
