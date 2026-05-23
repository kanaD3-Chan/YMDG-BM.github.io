---
title: 数论基础
order: 6
icon: mdi:numeric
category:
  - CTF
  - 手册
  - Crypto
---

密码学的数学基础。不需要深入证明，但要会用这些工具解题。

## 模运算

```python
# 基本运算
(a + b) % n
(a * b) % n
pow(a, b, n)   # a^b mod n（Python 内置，效率高）

# 模逆元：a * x ≡ 1 (mod n)
from Crypto.Util.number import inverse
x = inverse(a, n)   # 要求 gcd(a, n) = 1

# 用 gmpy2（更快）
import gmpy2
x = int(gmpy2.invert(a, n))
```

## 最大公约数与扩展欧几里得

```python
import math
math.gcd(a, b)   # 最大公约数

# 扩展欧几里得：ax + by = gcd(a, b)
from gmpy2 import gcdext
g, x, y = gcdext(a, b)
# g = gcd(a, b), a*x + b*y = g
```

**CTF 用途**：
- 判断模逆元是否存在（`gcd(a, n) == 1`）
- 共模攻击中求 `s1, s2` 使 `e1*s1 + e2*s2 = 1`

## 中国剩余定理（CRT）

已知 x 对多个模数的余数，求 x：

```
x ≡ r1 (mod m1)
x ≡ r2 (mod m2)
x ≡ r3 (mod m3)
```

```python
from sympy.ntheory.modular import crt

moduli = [m1, m2, m3]
remainders = [r1, r2, r3]
M, x = crt(moduli, remainders)
# x 是满足条件的最小非负整数，M = m1*m2*m3

# 或者用 gmpy2
from gmpy2 import mpz
# 手动实现
def crt_manual(remainders, moduli):
    M = 1
    for m in moduli:
        M *= m
    x = 0
    for r, m in zip(remainders, moduli):
        Mi = M // m
        x += r * Mi * int(gmpy2.invert(Mi, m))
    return x % M
```

**CTF 用途**：RSA 广播攻击、多组方程联立求解

## 费马小定理与欧拉定理

```
费马小定理：a^(p-1) ≡ 1 (mod p)，p 为质数
欧拉定理：a^φ(n) ≡ 1 (mod n)，gcd(a,n)=1
```

```python
# 快速幂模（Python 内置）
pow(a, p-1, p)  # = 1（费马小定理）

# 欧拉函数
from sympy import totient
phi = totient(n)

# 对于 n = p*q（RSA）
phi = (p-1) * (q-1)
```

## 质数相关

```python
from Crypto.Util.number import getPrime, isPrime, bytes_to_long, long_to_bytes

# 生成质数
p = getPrime(512)   # 512 位质数

# 判断质数
isPrime(n)

# 分解质因数（小数）
from sympy import factorint
factorint(12345)  # {3: 1, 5: 1, 823: 1}

# Fermat 分解（p, q 接近时有效）
def fermat_factor(n):
    a = gmpy2.isqrt(n) + 1
    b2 = a*a - n
    while not gmpy2.is_square(b2):
        a += 1
        b2 = a*a - n
    b = gmpy2.isqrt(b2)
    return int(a - b), int(a + b)
```

## 离散对数

已知 g、p、y，求 x 使得 `g^x ≡ y (mod p)`：

```python
# SageMath（处理大数）
from sage.all import *
p = ...
g = ...
y = ...
x = discrete_log(Mod(y, p), Mod(g, p))

# 小步大步算法（Baby-step Giant-step，适合小阶）
def bsgs(g, y, p, order=None):
    if order is None:
        order = p - 1
    m = int(order**0.5) + 1
    # Baby steps
    table = {pow(g, j, p): j for j in range(m)}
    # Giant steps
    gm_inv = pow(pow(g, m, p), p-2, p)  # g^(-m) mod p
    gamma = y
    for i in range(m):
        if gamma in table:
            return i * m + table[gamma]
        gamma = gamma * gm_inv % p
    return None
```

## 格密码入门

格（Lattice）是线性代数中的离散结构，LLL 算法可以找到格中的短向量，用于攻击某些密码方案。

```python
# SageMath 中的 LLL
from sage.all import *

# 构造格基矩阵
M = Matrix(ZZ, [
    [1, 0, a],
    [0, 1, b],
    [0, 0, n]
])

# LLL 规约
L = M.LLL()
print(L[0])  # 最短向量
```

**CTF 用途**：
- 攻击 RSA 中的小明文（Coppersmith 方法）
- 攻击 ECDSA 中的偏置随机数
- 背包密码求解

## 练手资源

- [Cryptopals](https://cryptopals.com/) — 密码学挑战
- CTFHub Crypto 数论系列
- SageMath 官方文档
