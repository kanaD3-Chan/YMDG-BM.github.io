---
title: 编码技巧与奇葩编码
order: 1
icon: mdi:code-string
category:
  - CTF
  - 手册
  - Misc
---

CTF 中经常出现各种奇葩编码，有些是标准编码的变种，有些是自创的。本节汇总常见的编码识别和解码方法。

## 常见编码速查

### 标准编码

```python
import base64, codecs

# Base64
base64.b64decode("SGVsbG8gV29ybGQ=")

# Base32
base64.b32decode("JBSWY3DPEB3W64TMMQ======")

# Base16（Hex）
bytes.fromhex("48656c6c6f")

# URL 编码
from urllib.parse import unquote
unquote("%48%65%6c%6c%6f")

# HTML 实体
import html
html.unescape("&#72;&#101;&#108;&#108;&#111;")

# ROT13
codecs.decode("Uryyb", 'rot_13')
```

### Base 家族变种

```python
# Base58（比特币地址用）
import base58
base58.b58decode("Cn8eVZg")

# Base85
base64.b85decode("BOu!rDZ")

# Base62（只用字母数字）
# 需要自己实现或用第三方库

# 自定义字符表的 Base64
# 把标准字符表替换成自定义的
import string
standard = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
custom   = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/"
data = "..."
translated = data.translate(str.maketrans(custom, standard))
base64.b64decode(translated)
```

## 特殊编码

### 摩斯密码变种

```
标准摩斯：. - 空格分隔
变种1：0 1 代替 . -
变种2：* / 代替 . -
变种3：去掉空格，用 / 分隔字母
```

```python
MORSE = {'.-':'A','-...':'B','-.-.':'C','-..':'D','.':'E',
         '..-.':'F','--.':'G','....':'H','..':'I','.---':'J',
         '-.-':'K','.-..':'L','--':'M','-.':'N','---':'O',
         '.--.':'P','--.-':'Q','.-.':'R','...':'S','-':'T',
         '..-':'U','...-':'V','.--':'W','-..-':'X','-.--':'Y',
         '--..':'Z','-----':'0','.----':'1','..---':'2',
         '...--':'3','....-':'4','.....':'5','-....':'6',
         '--...':'7','---..':'8','----.':'9'}

def decode_morse(s, dot='.', dash='-', sep=' '):
    s = s.replace(dot, '.').replace(dash, '-')
    return ''.join(MORSE.get(c, '?') for c in s.split(sep))
```

### 培根密码（Bacon's Cipher）

用 A/B 两种字符的 5 位组合表示字母：

```python
BACON = {'AAAAA':'A','AAAAB':'B','AAABA':'C','AAABB':'D','AABAA':'E',
         'AABAB':'F','AABBA':'G','AABBB':'H','ABAAA':'I','ABAAB':'J',
         'ABABA':'K','ABABB':'L','ABBAA':'M','ABBAB':'N','ABBBA':'O',
         'ABBBB':'P','BAAAA':'Q','BAAAB':'R','BAABA':'S','BAABB':'T',
         'BABAA':'U','BABAB':'V','BABBA':'W','BABBB':'X','BBAAA':'Y',
         'BBAAB':'Z'}

def decode_bacon(s):
    s = s.upper().replace(' ', '')
    return ''.join(BACON.get(s[i:i+5], '?') for i in range(0, len(s), 5))
```

### 猪圈密码、键盘密码

这类密码需要对照密码表，推荐直接用 [dCode.fr](https://www.dcode.fr/) 在线解密。

### 零宽字符隐写

文本中插入了不可见的零宽字符（U+200B、U+200C、U+200D 等）来隐藏信息：

```python
def decode_zero_width(text):
    # 零宽字符映射到 0/1
    mapping = {'​': '0', '‌': '1', '‍': '0', '﻿': '1'}
    bits = ''.join(mapping.get(c, '') for c in text)
    # 每 8 位转一个字符
    return ''.join(chr(int(bits[i:i+8], 2)) for i in range(0, len(bits), 8) if bits[i:i+8])
```

## 多层编码

CTF 中经常把多种编码叠加：

```
Base64 → Hex → ROT13 → Base32 → 明文
```

**解题策略**：
1. 先识别最外层编码（看字符集特征）
2. 解码一层，再识别下一层
3. 重复直到得到有意义的内容

```python
# CyberChef 的"Magic"功能可以自动识别并解码多层编码
# 在线地址：https://gchq.github.io/CyberChef/#recipe=Magic(3,false,false,'')
```

## 数字编码

```python
# ASCII 码
''.join(chr(c) for c in [72, 101, 108, 108, 111])

# Unicode 码点
''.join(chr(int(c, 16)) for c in ['0048', '0065', '006c', '006c', '006f'])

# 八进制
''.join(chr(int(c, 8)) for c in ['110', '145', '154', '154', '157'])
```

## 练手资源

- [CyberChef](https://gchq.github.io/CyberChef/) — 编码转换万金油
- [dCode.fr](https://www.dcode.fr/) — 古典密码和特殊编码在线解密
- CTFHub Misc 编码技能树
