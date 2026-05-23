---
title: 隐写术入门
order: 2
icon: mdi:eye-off-outline
category:
  - CTF
  - 手册
  - Misc
---

隐写术就是把信息藏在另一个文件里，让人看不出来。一张普通的风景照里可能藏着一段文字，一个压缩包里可能塞着另一个文件。

## 文件分析：先弄清楚你面对的是什么

拿到一个文件，不要急着用工具，先确认它的真实类型：

```bash
file unknown.jpg    # 查看文件类型
xxd unknown.bin | head -5  # 查看文件头
strings unknown.bin | grep -i flag  # 搜索字符串
```

### 常见文件头（魔术数字）

| 文件类型 | Hex | ASCII |
|----------|-----|-------|
| PNG | `89 50 4E 47` | `.PNG` |
| JPEG | `FF D8 FF` | `ÿØÿ` |
| GIF | `47 49 46 38` | `GIF8` |
| ZIP | `50 4B 03 04` | `PK..` |
| PDF | `25 50 44 46` | `%PDF` |
| RAR | `52 61 72 21` | `Rar!` |

**文件尾也同样重要**：PNG 以 `49 45 4E 44`（IEND）结尾，文件尾之后如果还有数据——那里面就有东西。

### 分离隐藏文件

```bash
binwalk -Me file.jpg   # 自动提取嵌套文件
foremost file.jpg      # 同上，老牌工具
```

## 图片隐写

### LSB 隐写（最常考）

每个像素由 RGB 三个通道组成，每个通道 8 位（0-255）。LSB（最低有效位）就是最低位——把这个位改了，人眼几乎看不出颜色变化，但可以藏信息。

```bash
zsteg image.png                  # 自动检测 PNG 的 LSB 隐写
steghide extract -sf image.jpg   # 提取 steghide 嵌入的数据
exiftool image.jpg               # 查看 EXIF 元数据
```

手动提取 LSB：

```python
from PIL import Image

img = Image.open('stego.png')
pixels = img.load()
bits = ''
for y in range(img.height):
    for x in range(img.width):
        r, g, b = pixels[x, y]
        bits += str(r & 1)  # 取红色通道最低位

flag = ''
for i in range(0, len(bits), 8):
    byte = int(bits[i:i+8], 2)
    if byte == 0:
        break
    flag += chr(byte)
print(flag)
```

### EXIF 信息

```bash
exiftool image.jpg
```

GPS 坐标、拍摄设备、拍摄时间——都可能藏着线索。

### 音频频谱图

用 Audacity 打开音频文件，切换到 **Spectrogram（频谱图）** 视图，Flag 常直接写在频谱图中。

### 盲水印（两张图对比）

```python
from PIL import Image

a = Image.open('1.png')
b = Image.open('2.png')
result = Image.new('RGB', a.size)
for x in range(a.width):
    for y in range(a.height):
        diff = abs(a.getpixel((x, y))[0] - b.getpixel((x, y))[0])
        result.putpixel((x, y), (diff * 20, diff * 20, diff * 20))
result.save('diff.png')
```

## 压缩包分析

### 伪加密

ZIP 文件有两个位置记录加密状态：文件头（`50 4B 03 04`）和目录区（`50 4B 01 02`）。有些 ZIP 只改了一个——这叫伪加密。

用 010 Editor 找到这两处，把偏移 +6 的加密标志位 `09 00` 改为 `00 00` 即可。

### CRC32 碰撞（小文件）

文件大小 ≤ 4 字节时，可以枚举所有可打印字符组合，比对 CRC32 值还原内容：

```python
import zipfile, itertools, string

with zipfile.ZipFile('challenge.zip') as z:
    for info in z.infolist():
        if info.file_size <= 4:
            crc_target = info.CRC
            for combo in itertools.product(string.printable, repeat=info.file_size):
                data = ''.join(combo).encode()
                if zipfile.crc32(data) & 0xFFFFFFFF == crc_target:
                    print(f"{info.filename}: {data}")
                    break
```

## 工具清单

```bash
sudo apt install -y binwalk foremost exiftool steghide wireshark
pip3 install pillow
gem install zsteg   # 需要先 sudo apt install ruby
```

Windows 工具：
- **010 Editor** — 十六进制编辑，改文件头/伪加密必备
- **Audacity** — 音频频谱分析
- **CyberChef**（网页版）— 编码转换万金油

## 练手资源

- CTFHub Misc 技能树
- 攻防世界 Misc 新手区
- 每做一道题，把思路和脚本记下来，下次碰到类似的直接复用
