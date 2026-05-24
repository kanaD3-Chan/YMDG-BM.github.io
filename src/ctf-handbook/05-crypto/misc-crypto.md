---
title: 杂项密码与编码识别
order: 9
icon: mdi:puzzle
category:
  - CTF
  - 手册
  - 密码学
---

CTF 中经常出现各种非主流密码和编码，本节汇总常见类型和快速识别方法。

## 快速识别流程

```
1. 看字符集：
   - 只有 0/1 → 二进制
   - 只有 0-9 → 十进制编码或电话键盘
   - 只有 0-9/A-F → 十六进制
   - 只有 A-Z/a-z/0-9/+/= → Base64 家族
   - 只有 . 和 - → 摩斯电码
   - 只有 A-Z（无数字）→ 古典密码

2. 看长度：
   - 是 4 的倍数（可能有 = 填充）→ Base64
   - 是 2 的倍数 → 十六进制

3. 用 CyberChef 的 Magic 功能自动识别
```

## 编码类

### Base 家族

```python
import base64

# Base64（标准）
base64.b64decode("SGVsbG8gV29ybGQ=")

# Base64 URL 安全变体（+ → -，/ → _）
base64.urlsafe_b64decode("SGVsbG8gV29ybGQ=")

# Base32
base64.b32decode("JBSWY3DPEBLW64TMMQ======")

# Base16（即十六进制）
base64.b16decode("48656C6C6F")

# Base85（ASCII85）
import base64
base64.a85decode(b"<~87cURD]i,\"Ebo7~>")

# Base58（比特币地址用）
# pip install base58
import base58
base58.b58decode("3yZe7d")
```

### 非标准 Base 变体

```python
# Base62（只用字母和数字，无 +/=）
# 常见于短链接

# Base91
# 字符集更大，编码效率更高

# 识别技巧：
# - 有 +/= → 标准 Base64
# - 无特殊字符，只有字母数字 → Base62 或 Base58
# - 有 ~<> → Base85
```

### 其他编码

```python
# URL 编码
from urllib.parse import unquote
unquote("%66%6C%61%67")  # → "flag"

# HTML 实体
# &#102;&#108;&#97;&#103; → "flag"
import html
html.unescape("&#102;&#108;&#97;&#103;")

# Unicode 转义
# flag → "flag"
"\\u0066\\u006c\\u0061\\u0067".encode().decode('unicode_escape')

# Punycode（国际化域名）
# xn--fiq228c.xn--fiq64b → 中文域名
```

## 古典密码

### 仿射密码

```python
# 加密：c = (a*p + b) mod 26
# 解密：p = a_inv * (c - b) mod 26
# 要求 gcd(a, 26) = 1

from Crypto.Util.number import inverse

def affine_decrypt(ciphertext, a, b):
    a_inv = inverse(a, 26)
    result = ""
    for c in ciphertext:
        if c.isalpha():
            c_num = ord(c.upper()) - ord('A')
            p_num = a_inv * (c_num - b) % 26
            result += chr(p_num + ord('A'))
        else:
            result += c
    return result

# 暴力破解（a 只有 12 种可能：1,3,5,7,9,11,15,17,19,21,23,25）
valid_a = [a for a in range(1, 26) if __import__('math').gcd(a, 26) == 1]
for a in valid_a:
    for b in range(26):
        result = affine_decrypt(ciphertext, a, b)
        if "flag" in result.lower() or "ctf" in result.lower():
            print(f"a={a}, b={b}: {result}")
```

### Playfair 密码

```python
# 5x5 字母方阵，I/J 合并，两字母一组加密
# 规则：同行取右，同列取下，矩形取对角

# 在线工具：https://www.dcode.fr/playfair-cipher
# 识别特征：密文长度为偶数，无 J（或无 I）
```

### 波利比奥斯方阵（Polybius Square）

```python
# 5x5 方阵，每个字母用行列坐标表示
# 例：A=11, B=12, ..., Z=55（I/J 合并）

def polybius_decode(ciphertext, key="ABCDEFGHIKLMNOPQRSTUVWXYZ"):
    matrix = [key[i:i+5] for i in range(0, 25, 5)]
    result = ""
    pairs = [ciphertext[i:i+2] for i in range(0, len(ciphertext), 2)]
    for pair in pairs:
        row, col = int(pair[0])-1, int(pair[1])-1
        result += matrix[row][col]
    return result
```

### 培根密码（Bacon's Cipher）

```python
# 用 A/B 两种字符（或大小写）表示 5 位二进制，对应字母
# AAAAA=A, AAAAB=B, ..., BBBBB=Z

bacon_table = {
    'AAAAA': 'A', 'AAAAB': 'B', 'AAABA': 'C', 'AAABB': 'D',
    'AABAA': 'E', 'AABAB': 'F', 'AABBA': 'G', 'AABBB': 'H',
    'ABAAA': 'I', 'ABAAB': 'J', 'ABABA': 'K', 'ABABB': 'L',
    'ABBAA': 'M', 'ABBAB': 'N', 'ABBBA': 'O', 'ABBBB': 'P',
    'BAAAA': 'Q', 'BAAAB': 'R', 'BAABA': 'S', 'BAABB': 'T',
    'BABAA': 'U', 'BABAB': 'V', 'BABBA': 'W', 'BABBB': 'X',
    'BBAAA': 'Y', 'BBAAB': 'Z',
}

def bacon_decode(text):
    # 将大写视为 B，小写视为 A
    normalized = ''.join('B' if c.isupper() else 'A' for c in text if c.isalpha())
    return ''.join(bacon_table.get(normalized[i:i+5], '?') for i in range(0, len(normalized), 5))
```

## 现代杂项

### 哈希识别

```bash
# 根据长度和字符集识别哈希类型
# MD5:    32 位十六进制
# SHA1:   40 位十六进制
# SHA256: 64 位十六进制
# SHA512: 128 位十六进制
# bcrypt: $2b$... 开头
# NTLM:   32 位十六进制（与 MD5 同长，但算法不同）

# 工具：hash-identifier
hash-identifier
# 或 hashid
hashid "5f4dcc3b5aa765d61d8327deb882cf99"
```

### 哈希碰撞利用

```python
# MD5 已知碰撞对（两个不同文件有相同 MD5）
# 可用于绕过 MD5 验证

# 著名碰撞对（前缀相同，后缀不同）
# 参考：https://www.mscs.dal.ca/~selinger/md5collision/

# PHP 弱类型比较
# "0e..." 开头的 MD5 值在 == 比较时都等于 0
magic_md5 = {
    "240610708": "0e462097431906509019562988736854",
    "QNKCDZO":   "0e830400451993494058024219903391",
    "aabg7XSs":  "0e087386482136013740957780965295",
}
```

### 零宽字符隐写

```python
# 零宽字符：​（零宽空格）、‌（零宽非连接符）等
# 人眼不可见，但可以编码信息

def decode_zero_width(text):
    # 将零宽字符映射为 0/1
    mapping = {'​': '0', '‌': '1', '‍': ' '}
    binary = ''.join(mapping.get(c, '') for c in text)
    # 每8位转换为字符
    chars = [chr(int(binary[i:i+8], 2)) for i in range(0, len(binary), 8)]
    return ''.join(chars)
```

## 自动化工具

```bash
# CyberChef（在线，功能最全）
# https://gchq.github.io/CyberChef/

# dcode.fr（古典密码在线工具）
# https://www.dcode.fr/

# quipqiup（自动频率分析破解替换密码）
# https://quipqiup.com/

# 本地工具
pip install cryptography  # 现代密码库（包括对称/非对称/哈希等）
```

## 练手资源

- [CryptoHack](https://cryptohack.org/) — 密码学 CTF 平台
- CTFHub 密码学杂项系列
- [dcode.fr](https://www.dcode.fr/) — 古典密码工具集
