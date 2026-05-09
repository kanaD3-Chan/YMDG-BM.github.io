---
title: SLsec Week2 Affine
index: true
icon: codicon:note
category:
  - CTF
  - Writeup
  - Crypto
tag:
  - CTF
  - Crypto
  - SLsec  
---
## Affine 密码简介

Affine（仿射）密码是一种替换密码，它使用以下数学公式来加密字符：

$$
E(x) = (a \cdot x + b) \pmod{m}
$$

其中：

- $E(x)$ 是加密后的字符（对应的数字）；
- $x$ 是原始字符（通常是从 0 开始的数字，例如 `'a'` → 0，`'b'` → 1，依此类推）；
- $a$ 和 $b$ 是密钥；
- $m$ 是字母表的大小（对于英文字母，$m = 26$）。

解密过程使用以下公式：

$$
D(y) = a^{-1} \cdot (y - b) \pmod{m}
$$

其中：

- $D(y)$ 是解密后的字符，$y$ 是加密后的字符；
- $a^{-1}$ 是 $a$ 在模 $m$ 下的乘法逆元，即满足 $a \cdot a^{-1} \equiv 1 \pmod{m}$ 的数。

在 Affine 密码中，为了确保 $a$ 有乘法逆元，$a$ 必须与 $m$ 互质。例如，对于英文字母，$a$ 必须与 26 互质。

---

## 爆破脚本

下面给出一个爆破 Affine 密码的 Python 脚本：

```python
import math

def affine_decrypt(ciphertext, a, b, m=26):
    # 解密函数
    plaintext = ''
    for char in ciphertext:
        if char.isalpha():  # 只处理字母
            # 将字符转换为0-25的范围
            char_value = ord(char.lower()) - ord('a')
            # 应用Affine解密公式
            decrypted_value = (a * char_value - b) % m
            # 转换回字符
            plaintext += chr(decrypted_value + ord('a'))
        else:
            # 非字母字符保持不变
            plaintext += char
    return plaintext

def crack_affine(ciphertext):
    # 爆破Affine cipher
    for a in [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]:
        for b in range(26):
            # 检查a和26是否互质
            if math.gcd(a, 26) == 1:
                decrypted_text = affine_decrypt(ciphertext, a, b)
                print(f"Key (a={a}, b={b}) -> Decrypted text: {decrypted_text}")

# 给定的密文
ciphertext = "pii1c3_jv_1ce3m3vejcr"
crack_affine(ciphertext)
```

## 脚本说明
**affine_decrypt**：实现 Affine 解密公式，处理字母字符，非字母字符保持不变。

**crack_affine**：遍历所有可能的 $a$（与 26 互质）和 $b$（0~25），调用解密函数并输出结果。

## 运行结果（部分）

```text
Key (a=1, b=0) -> Decrypted text: pii1c3_jv_1ce3m3vejcr
Key (a=1, b=1) -> Decrypted text: ohh1b3_iu_1bd3l3udibq
……（省略）
Key (a=3, b=18) -> Decrypted text: bgg1o3_jt_1ou3s3tujoh
Key (a=3, b=19) -> Decrypted text: aff1n3_is_1nt3r3sting
Key (a=3, b=20) -> Decrypted text: zee1m3_hr_1ms3q3rshmf
……（省略）
Key (a=25, b=25) -> Decrypted text: mtt1z3_sg_1zx3p3gxszk
```

注意到当 $a=3$，$b=19$ 时，解密出了有意义的文本：

```
aff1n3_is_1nt3r3sting
```

即 affine_is_interesting（其中数字 1 和 3 分别代表字母 i 和 e 的 Leet 写法）。

因此，正确的密钥为 $(a, b) = (3, 19)$。