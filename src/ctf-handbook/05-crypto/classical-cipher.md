---
title: 古典密码与编码
order: 1
icon: mdi:alphabetical-variant
category:
  - CTF
  - 手册
  - Crypto
---

CTF 密码学的入门题通常是古典密码或编码识别，用 CyberChef 就能解决大部分。

## 编码识别速查

拿到一串奇怪的字符，先判断是什么编码：

| 特征 | 类型 | 解码方法 |
|------|------|---------|
| 只有 `A-Za-z0-9+/=`，末尾有 `=` | Base64 | `base64 -d` |
| 只有 `A-Z2-7=`，全大写 | Base32 | CyberChef |
| 只有 `0-9a-f`，长度偶数 | Hex | `bytes.fromhex()` |
| 只有 `.` 和 `-`，空格分隔 | 摩斯密码 | CyberChef |
| 只有 `0` 和 `1` | 二进制 | `int(s, 2)` |
| 看起来像乱码但有规律 | ROT13/凯撒 | 枚举 |
| `&#数字;` 或 `%XX` | HTML/URL 编码 | CyberChef |

```python
# 常用解码一行代码
import base64

base64.b64decode("SGVsbG8=")          # Base64
bytes.fromhex("48656c6c6f")           # Hex
base64.b32decode("JBSWY3DPEB3W64TMMQ==")  # Base32
```

## 凯撒密码

字母表循环位移 N 位。

```python
def caesar_decrypt(ciphertext, shift):
    result = ''
    for c in ciphertext:
        if c.isupper():
            result += chr((ord(c) - ord('A') - shift) % 26 + ord('A'))
        elif c.islower():
            result += chr((ord(c) - ord('a') - shift) % 26 + ord('a'))
        else:
            result += c
    return result

# 暴力枚举所有 26 种可能
ciphertext = "Gur dhvpx oebja sbk"
for shift in range(26):
    print(f"shift={shift}: {caesar_decrypt(ciphertext, shift)}")
```

## ROT13

凯撒密码的特例，位移 13 位，加密和解密是同一个操作。

```python
import codecs
codecs.decode("Uryyb Jbeyq", 'rot_13')  # → "Hello World"
```

## 维吉尼亚密码

用一个密钥字符串循环异或，每个字母的位移量由密钥决定。

```python
def vigenere_decrypt(ciphertext, key):
    result = ''
    key = key.upper()
    j = 0
    for c in ciphertext:
        if c.isalpha():
            shift = ord(key[j % len(key)]) - ord('A')
            if c.isupper():
                result += chr((ord(c) - ord('A') - shift) % 26 + ord('A'))
            else:
                result += chr((ord(c) - ord('a') - shift) % 26 + ord('a'))
            j += 1
        else:
            result += c
    return result
```

**不知道密钥时**：用重合指数法（Index of Coincidence）估算密钥长度，再对每个位置单独做频率分析。CyberChef 的 "Vigenère Decode" 可以自动破解。

## 栅栏密码

把字符串按 N 列排列，然后按行读取（或反过来）。

```
原文：HELLOWORLD
按 2 列排列：
H E L L O
W O R L D
按行读取：HELOWORLDL → 密文

解密：把密文按 N 行排列，按列读取
```

```python
def rail_fence_decrypt(ciphertext, rails):
    n = len(ciphertext)
    pattern = []
    rail = 0
    direction = 1
    for i in range(n):
        pattern.append(rail)
        if rail == 0:
            direction = 1
        elif rail == rails - 1:
            direction = -1
        rail += direction

    indices = sorted(range(n), key=lambda i: pattern[i])
    result = [''] * n
    for i, idx in enumerate(indices):
        result[idx] = ciphertext[i]
    return ''.join(result)
```

## 摩斯密码

```python
MORSE = {
    '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E',
    '..-.': 'F', '--.': 'G', '....': 'H', '..': 'I', '.---': 'J',
    '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N', '---': 'O',
    '.--.': 'P', '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T',
    '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X', '-.--': 'Y',
    '--..': 'Z', '-----': '0', '.----': '1', '..---': '2',
    '...--': '3', '....-': '4', '.....': '5', '-....': '6',
    '--...': '7', '---..': '8', '----.': '9',
}

def morse_decode(code):
    return ''.join(MORSE.get(c, '?') for c in code.split())

print(morse_decode(".... . .-.. .-.. ---"))  # HELLO
```

## 常用在线工具

- [CyberChef](https://gchq.github.io/CyberChef/) — 编码/解码/加密一站式
- [dCode](https://www.dcode.fr/) — 古典密码在线破解，支持自动识别
- [quipqiup](https://quipqiup.com/) — 替换密码自动破解

## 课后练习

- [凯撒大帝的密信](http://172.16.173.140/training/11?challenge=66) — 一段用凯撒密码加密的密文，枚举 shift 解出 flag
