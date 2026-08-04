---
title: AES 对称加密攻击
order: 3
icon: mdi:lock-outline
category:
  - CTF
  - 手册
  - Crypto
---

AES 本身是安全的，但错误的使用方式（尤其是 ECB 和 CBC 模式）会引入可利用的漏洞。

## AES 基础

AES 是分组密码，每次处理 16 字节（128 位）的数据块。

```python
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

key = b'0123456789abcdef'  # 16/24/32 字节
plaintext = b'Hello, World!!!'

# ECB 模式加密
cipher = AES.new(key, AES.MODE_ECB)
ciphertext = cipher.encrypt(pad(plaintext, 16))

# ECB 模式解密
cipher = AES.new(key, AES.MODE_ECB)
plaintext = unpad(cipher.decrypt(ciphertext), 16)
```

## ECB 模式漏洞

**ECB（电子密码本）**：每个 16 字节块独立加密，相同的明文块产生相同的密文块。

```
明文：[AAAAAAAAAAAAAAAA][AAAAAAAAAAAAAAAA][BBBBBBBBBBBBBBBB]
密文：[XXXXXXXXXXXXXXXX][XXXXXXXXXXXXXXXX][YYYYYYYYYYYYYYYY]
                ↑ 相同！
```

### 攻击一：ECB 字节翻转（选择明文攻击）

**场景**：你能控制部分明文，服务器用 ECB 加密后返回密文。

**目标**：让加密结果包含你想要的内容（比如 `admin=true`）。

**原理**：通过精心构造输入，让目标字节恰好落在某个块的边界，然后逐字节枚举。

```python
# 示例：服务器加密 prefix + your_input + suffix
# 通过控制 your_input 的长度，让 suffix 的第一个字节单独成块
# 然后枚举所有可能的字节，找到密文匹配的那个

def oracle(plaintext):
    # 模拟服务器加密
    data = prefix + plaintext + suffix
    cipher = AES.new(key, AES.MODE_ECB)
    return cipher.encrypt(pad(data, 16))

# 逐字节恢复 suffix
known = b''
for i in range(len(suffix)):
    block_size = 16
    padding = b'A' * (block_size - 1 - (i % block_size))
    target_block = oracle(padding)[:(i // block_size + 1) * block_size]

    for byte in range(256):
        attempt = padding + known + bytes([byte])
        if oracle(attempt)[:len(target_block)] == target_block:
            known += bytes([byte])
            break
```

### 攻击二：ECB 重放攻击

**场景**：Cookie 或 Token 用 ECB 加密，你能注册用户名。

**利用**：注册用户名 `AAAAAAAAAAAAAAAAadmin\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b`（16 字节填充 + `admin` + PKCS7 填充），然后截取第二个密文块，拼接到正常 Cookie 后面。

## CBC 模式漏洞

**CBC（密码块链接）**：每个明文块先与前一个密文块 XOR，再加密。

```
加密：C[i] = AES(P[i] XOR C[i-1])
解密：P[i] = AES_dec(C[i]) XOR C[i-1]
```

### 字节翻转攻击

**原理**：修改 C[i-1] 的某个字节，会直接影响 P[i] 对应字节的解密结果（XOR 关系）。

```python
# 目标：把 P[i] 的某个字节从 'a' 改成 'A'
# 只需要修改 C[i-1] 对应位置的字节

# P[i][j] = AES_dec(C[i])[j] XOR C[i-1][j]
# 想要 P[i][j] = target
# 则 C[i-1][j] ^= (original ^ target)

ciphertext = bytearray(ciphertext)
ciphertext[block_index * 16 + byte_offset] ^= (ord('a') ^ ord('A'))
```

### Padding Oracle 攻击

**场景**：服务器解密后会告诉你 Padding 是否正确（通过错误信息或响应时间）。

**原理**：PKCS7 填充要求最后 N 个字节都是 `\x0N`。通过枚举修改密文，观察 Padding 是否合法，逐字节恢复明文。

```python
# 核心思路：
# 对于最后一个字节，枚举 0-255，找到让 Padding 合法的值
# 合法时：AES_dec(C[i])[15] XOR modified_C[i-1][15] = 0x01
# 因此：AES_dec(C[i])[15] = 0x01 XOR modified_C[i-1][15]
# 原始明文：P[i][15] = AES_dec(C[i])[15] XOR original_C[i-1][15]
```

工具：`padbuster`、`PadBuster.py`

## 哈希长度扩展攻击

当签名方式为 `hash(secret + message)` 时，可以在不知道 secret 的情况下，伪造 `hash(secret + message + padding + extension)` 的签名。

```bash
# 使用 hashpump 工具
hashpump -s "已知签名" -d "已知消息" -a "要追加的内容" -k "secret长度"
```

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

- [AES 的弱点](http://172.16.173.140/training/11?challenge=70) — AES-ECB 模式 oracle，逐字节推断 flag

## 练手资源

- CTFHub Crypto 技能树（AES 相关题目）
- PortSwigger Web Security Academy（Padding Oracle 模块）
