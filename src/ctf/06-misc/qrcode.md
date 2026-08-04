---
title: 二维码与条形码分析
order: 4
icon: mdi:qrcode
category:
  - CTF
  - 手册
  - Misc
---

二维码和条形码在 CTF Misc 题中经常出现，有时需要修复损坏的二维码或从图像中提取编码数据。

## 二维码基础

### QR 码结构

```
┌─────────────────────────────┐
│ ██ ██████ ██  定位图案（左上）│
│ ██ █    █ ██               │
│ ██ ██████ ██  格式信息       │
│                             │
│    数据区域（编码实际内容）   │
│                             │
│ ██ ██████ ██  定位图案（左下）│
└─────────────────────────────┘
```

关键组成：
- **定位图案**：三个角的方形图案，用于定位和校正
- **格式信息**：纠错级别（L/M/Q/H）和掩码模式
- **数据区域**：实际编码的内容
- **纠错码**：允许一定程度的损坏仍可读取（H 级别可恢复 30% 损坏）

### 读取二维码

```python
# 方法1：pyzbar
from pyzbar.pyzbar import decode
from PIL import Image

img = Image.open("qrcode.png")
results = decode(img)
for r in results:
    print(r.data.decode('utf-8'))
    print(f"类型：{r.type}")

# 方法2：cv2
import cv2
img = cv2.imread("qrcode.png")
detector = cv2.QRCodeDetector()
data, bbox, _ = detector.detectAndDecode(img)
print(data)

# 方法3：命令行
zbarimg qrcode.png
```

## 修复损坏的二维码

### 手动修复

```python
from PIL import Image
import numpy as np

# 读取二维码图像
img = np.array(Image.open("damaged_qr.png").convert('L'))

# 二值化
threshold = 128
binary = (img < threshold).astype(np.uint8)  # 1=黑，0=白

# 查看尺寸（标准 QR 码是奇数×奇数）
print(f"尺寸：{binary.shape}")

# 计算模块大小（每个小方块的像素数）
# 定位图案是 7×7 模块，可以用来推算模块大小
```

### 利用纠错能力

QR 码的 H 级纠错可以恢复 30% 的数据损坏。如果损坏区域不超过这个比例，可以直接用读取工具解码。

```bash
# 尝试直接读取（即使有损坏）
zbarimg --set enable-partial damaged_qr.png

# 或者用在线工具
# https://merricx.github.io/qrazybox/  （QR 码分析和修复工具）
```

### 重建定位图案

```python
from PIL import Image, ImageDraw
import numpy as np

def add_finder_pattern(img_array, x, y, module_size):
    """在 (x, y) 位置添加定位图案"""
    # 定位图案：7×7 的方形图案
    pattern = [
        [1,1,1,1,1,1,1],
        [1,0,0,0,0,0,1],
        [1,0,1,1,1,0,1],
        [1,0,1,1,1,0,1],
        [1,0,1,1,1,0,1],
        [1,0,0,0,0,0,1],
        [1,1,1,1,1,1,1],
    ]
    for i, row in enumerate(pattern):
        for j, val in enumerate(row):
            px = x + j * module_size
            py = y + i * module_size
            color = 0 if val else 255
            img_array[py:py+module_size, px:px+module_size] = color
    return img_array
```

## 条形码

### 常见条形码类型

| 类型 | 特征 | 用途 |
|------|------|------|
| Code 128 | 高密度，支持所有 ASCII | 物流、工业 |
| Code 39 | 只支持大写字母和数字 | 工业标签 |
| EAN-13 | 13 位数字，商品条码 | 零售 |
| QR Code | 二维，高容量 | 通用 |
| Data Matrix | 二维，小尺寸 | 电子元件 |
| PDF417 | 二维，高容量 | 证件 |

```python
# 读取各种条形码
from pyzbar.pyzbar import decode
from PIL import Image

img = Image.open("barcode.png")
for barcode in decode(img):
    print(f"类型：{barcode.type}")
    print(f"数据：{barcode.data.decode()}")
    print(f"位置：{barcode.rect}")
```

### 生成条形码（用于测试）

```python
# pip install python-barcode qrcode[pil]

import qrcode
import barcode
from barcode.writer import ImageWriter

# 生成 QR 码
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H)
qr.add_data("flag{test_flag}")
qr.make(fit=True)
img = qr.make_image()
img.save("test_qr.png")

# 生成 Code128 条形码
code128 = barcode.get('code128', 'flag{test}', writer=ImageWriter())
code128.save('test_barcode')
```

## CTF 常见题型

### 题型1：直接读取

```bash
# 图片中有二维码，直接读取
zbarimg challenge.png
# 或用手机扫描
```

### 题型2：损坏的二维码

```
特征：二维码部分区域被遮挡或损坏
方法：
1. 检查损坏程度，如果 < 30% 直接尝试读取
2. 用 QRazyBox 在线工具手动修复
3. 如果定位图案完整，只是数据区损坏，利用纠错码恢复
```

### 题型3：隐藏在图像中的二维码

```python
# 二维码可能隐藏在图像的特定颜色通道或位平面中
from PIL import Image
import numpy as np

img = np.array(Image.open("hidden.png"))

# 检查各位平面
for bit in range(8):
    plane = (img[:,:,0] >> bit) & 1  # 红色通道的第 bit 位
    Image.fromarray((plane * 255).astype(np.uint8)).save(f"plane_r_{bit}.png")
```

### 题型4：多个二维码拼接

```
特征：多张图片各包含二维码的一部分，或多个二维码编码不同部分
方法：
1. 分别读取每个二维码
2. 按顺序拼接内容（注意可能有 Base64 或其他编码）
```

## 工具速查

```bash
# 读取
zbarimg image.png          # 命令行读取
zbarcam                    # 摄像头实时读取

# 在线工具
# https://merricx.github.io/qrazybox/  QR 码分析修复
# https://www.onlinebarcodereader.com/  在线读取

# Python 库
pip install pyzbar pillow qrcode python-barcode
```

## 练手资源

- CTFHub Misc 二维码系列
- 攻防世界 Misc 条形码题目
- [QRazyBox](https://merricx.github.io/qrazybox/) — QR 码分析工具
