---
title: 椭圆曲线密码学
order: 7
icon: mdi:chart-bell-curve
category:
  - CTF
  - 手册
  - Crypto
---

椭圆曲线密码学（ECC）是现代密码学的重要组成部分，在 CTF 中以理解原理和利用参数漏洞为主。

## 椭圆曲线基础

椭圆曲线方程（Weierstrass 形式）：

```
y² = x³ + ax + b  (mod p)
```

曲线上的点构成一个群，定义了"点加法"运算：

```python
from sage.all import *

# 定义椭圆曲线
p = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
a = 0
b = 7
E = EllipticCurve(GF(p), [a, b])  # secp256k1（比特币用的曲线）

# 生成元
G = E.gen(0)

# 点乘（标量乘法）
k = 12345
P = k * G
print(P)
```

## ECDH 密钥交换

```python
# Alice
a = random_scalar()
A = a * G  # 公钥

# Bob
b = random_scalar()
B = b * G  # 公钥

# 共享密钥
# Alice: a * B = a * b * G
# Bob:   b * A = b * a * G
# 两者相等！
shared_key = a * B  # = b * A
```

## ECDSA 签名

```python
from Crypto.PublicKey import ECC
from Crypto.Signature import DSS
from Crypto.Hash import SHA256

# 生成密钥
key = ECC.generate(curve='P-256')

# 签名
h = SHA256.new(b"message")
signer = DSS.new(key, 'fips-186-3')
signature = signer.sign(h)

# 验证
verifier = DSS.new(key.public_key(), 'fips-186-3')
verifier.verify(h, signature)
```

## 常见攻击

### 1. 随机数重用（ECDSA nonce 重用）

ECDSA 签名时需要一个随机数 k，如果 k 被重用，私钥就会泄露：

```python
# 两次签名使用了相同的 k
# r1 == r2（因为 r = (k*G).x mod n）

# 恢复私钥
# s1 = k^-1 * (h1 + r*d) mod n
# s2 = k^-1 * (h2 + r*d) mod n
# s1 - s2 = k^-1 * (h1 - h2) mod n
# k = (h1 - h2) * (s1 - s2)^-1 mod n
# d = (s1*k - h1) * r^-1 mod n

from Crypto.Util.number import inverse

def recover_private_key(r, s1, s2, h1, h2, n):
    k = ((h1 - h2) * inverse(s1 - s2, n)) % n
    d = ((s1 * k - h1) * inverse(r, n)) % n
    return d, k
```

### 2. 无效曲线攻击

当服务器不验证收到的点是否在曲线上时，攻击者可以发送不在曲线上的点，利用小阶点泄露私钥信息。

### 3. 弱曲线参数

```python
# 如果曲线的阶 n 很小，可以直接暴力破解离散对数
# P = k * G，已知 P 和 G，求 k

# SageMath 中的离散对数
E = EllipticCurve(GF(p), [a, b])
G = E(Gx, Gy)
P = E(Px, Py)
k = discrete_log(P, G, operation='+')
```

### 4. MOV 攻击（超奇异曲线）

对于超奇异椭圆曲线，可以把椭圆曲线离散对数问题规约到有限域上的离散对数问题：

```python
# SageMath
E = EllipticCurve(GF(p), [a, b])
# 检查是否超奇异
print(E.is_supersingular())
# 如果是，用 MOV 攻击
```

## 实用工具

```python
# SageMath（处理椭圆曲线的最佳工具）
from sage.all import *

# pycryptodome（实现 ECDSA）
from Crypto.PublicKey import ECC

# tinyec（轻量级 ECC 库）
pip install tinyec
```

## 练手资源

- CTFHub Crypto 椭圆曲线系列
- [Cryptopals](https://cryptopals.com/) — 密码学挑战（Set 6 有 ECDSA 题）

## 课后练习

- [椭圆曲线上的秘密](http://172.16.173.140/training/11?challenge=74) — 椭圆曲线参数太小，暴力破解离散对数解密 flag
