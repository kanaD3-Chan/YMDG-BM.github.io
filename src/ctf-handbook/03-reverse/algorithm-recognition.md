---
title: 常见加密算法识别
order: 5
icon: mdi:lock-check-outline
category:
  - CTF
  - 手册
  - Reverse
---

逆向题中经常遇到各种加密算法，能快速识别算法类型是解题的关键第一步。

## 识别方法

### 1. 特征常数识别

每种算法都有独特的魔术常数，在 IDA 里搜索这些常数就能定位算法：

| 算法 | 特征常数 |
|------|---------|
| MD5 | `0x67452301`, `0xEFCDAB89`, `0x98BADCFE`, `0x10325476` |
| SHA-1 | `0x67452301`, `0xEFCDAB89`, `0x98BADCFE`, `0x10325476`, `0xC3D2E1F0` |
| SHA-256 | `0x6A09E667`, `0xBB67AE85`, `0x3C6EF372`, `0xA54FF53A` |
| AES | S-box 第一个字节 `0x63`，或 `0x01020408` 等轮常数 |
| TEA | `0x9E3779B9`（黄金比例的倒数） |
| RC4 | 256 字节的 S-box 初始化（`S[i] = i`） |
| CRC32 | `0xEDB88320`（反转多项式） |
| Base64 | 字符表 `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/` |

```python
# IDA Python：搜索特征常数
import idaapi
ea = idaapi.find_binary(0, idaapi.BADADDR, "B9 79 37 9E", 16, idaapi.SEARCH_DOWN)
print(hex(ea))  # 找到 TEA 的特征常数位置
```

### 2. 代码结构识别

**XOR 加密**：
```c
// 特征：循环 + 异或操作
for (int i = 0; i < len; i++) {
    buf[i] ^= key[i % key_len];
}
```

**RC4**：
```c
// 特征：256 字节 S-box + 两个索引 i, j 的交换
for (i = 0; i < 256; i++) S[i] = i;
for (i = j = 0; i < 256; i++) {
    j = (j + S[i] + key[i % key_len]) % 256;
    swap(S[i], S[j]);
}
```

**TEA**：
```c
// 特征：32 轮循环 + 0x9E3779B9 常数
uint32_t delta = 0x9E3779B9;
uint32_t sum = 0;
for (int i = 0; i < 32; i++) {
    sum += delta;
    v0 += ((v1 << 4) + k0) ^ (v1 + sum) ^ ((v1 >> 5) + k1);
    v1 += ((v0 << 4) + k2) ^ (v0 + sum) ^ ((v0 >> 5) + k3);
}
```

## 常见算法解密脚本

### XOR

```python
cipher = bytes.fromhex("deadbeef...")
key = b"secret"
flag = bytes(c ^ key[i % len(key)] for i, c in enumerate(cipher))
print(flag)
```

### RC4

```python
def rc4(key, data):
    S = list(range(256))
    j = 0
    for i in range(256):
        j = (j + S[i] + key[i % len(key)]) % 256
        S[i], S[j] = S[j], S[i]

    i = j = 0
    result = []
    for byte in data:
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]
        result.append(byte ^ S[(S[i] + S[j]) % 256])
    return bytes(result)

flag = rc4(b"key", bytes.fromhex("ciphertext"))
print(flag)
```

### TEA 解密

```python
import struct

def tea_decrypt(v, key):
    v0, v1 = v
    k = struct.unpack('4I', key)
    delta = 0x9E3779B9
    s = (delta * 32) & 0xFFFFFFFF
    for _ in range(32):
        v1 = (v1 - (((v0 << 4) + k[2]) ^ (v0 + s) ^ ((v0 >> 5) + k[3]))) & 0xFFFFFFFF
        v0 = (v0 - (((v1 << 4) + k[0]) ^ (v1 + s) ^ ((v1 >> 5) + k[1]))) & 0xFFFFFFFF
        s = (s - delta) & 0xFFFFFFFF
    return v0, v1
```

## 自定义加密识别

很多 CTF 题会对标准算法做轻微修改（改常数、改轮数、改操作顺序）：

1. **先识别基础算法**：找特征常数或代码结构
2. **对比标准实现**：找出被修改的地方
3. **逆向修改后的算法**：根据修改写对应的解密脚本

## 工具辅助

```bash
# findcrypt：IDA 插件，自动识别加密常数
# 安装后在 IDA 菜单 Edit → Plugins → FindCrypt

# capa：自动分析程序能力（包括加密算法）
pip install capa
capa binary.exe
```

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

- [这是什么加密](http://172.16.173.140/training/11?challenge=59) — 识别程序中使用的加密算法，写出对应的解密脚本

## 练手资源

- 攻防世界 Reverse 中级题（算法逆向系列）
- CTFHub 逆向技能树
