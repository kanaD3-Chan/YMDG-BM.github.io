---
title: Diffie-Hellman 与密钥交换攻击
order: 8
icon: mdi:key-chain
category:
  - CTF
  - 手册
  - 密码学
---

Diffie-Hellman（DH）密钥交换是现代密码学的基石，CTF 中常见针对弱参数或实现缺陷的攻击。

## DH 密钥交换原理

```
公开参数：大质数 p，生成元 g

Alice：选私钥 a，计算 A = g^a mod p，发送 A
Bob：  选私钥 b，计算 B = g^b mod p，发送 B

共享密钥：
Alice 计算：K = B^a mod p = g^(ab) mod p
Bob   计算：K = A^b mod p = g^(ab) mod p
```

安全性依赖于离散对数问题的困难性：已知 g、p、A，求 a 是困难的。

## 常见攻击

### 1. 小子群攻击（Small Subgroup Attack）

当 p-1 有小质因子时，可以把离散对数问题分解到小子群中求解。

```python
from sympy import factorint
from sympy.ntheory.residues import n_order

def small_subgroup_attack(g, p, A):
    """
    如果 p-1 有小质因子，可以恢复 a mod small_factor
    再用 CRT 合并
    """
    factors = factorint(p - 1)
    print(f"p-1 的因子分解：{factors}")

    results = []
    moduli = []

    for q, e in factors.items():
        if q < 2**20:  # 只处理小质因子
            # 把 g 和 A 映射到 q 阶子群
            h = pow(g, (p-1)//q, p)
            B = pow(A, (p-1)//q, p)

            # 在小子群中暴力求离散对数
            for x in range(q):
                if pow(h, x, p) == B:
                    results.append(x)
                    moduli.append(q)
                    break

    return results, moduli
```

### 2. 中间人攻击（MITM）

DH 本身不提供身份认证，容易遭受中间人攻击：

```
正常：Alice ←→ Bob
攻击：Alice ←→ Mallory ←→ Bob

Mallory 与 Alice 建立一个 DH 会话
Mallory 与 Bob 建立另一个 DH 会话
Mallory 可以解密并转发所有消息
```

**防御**：使用证书或预共享密钥对 DH 参数进行认证（TLS 中的做法）。

### 3. 弱参数攻击

```python
# 情况1：p 不是质数
# 如果 p = p1 * p2，可以分别在 mod p1 和 mod p2 中求解

# 情况2：g 的阶很小
# 如果 g 的阶 ord 很小，暴力枚举 g^0, g^1, ..., g^(ord-1)

# 情况3：p 太小（< 512 bit）
# 可以用 index calculus 算法在合理时间内求解
```

### 4. Pohlig-Hellman 算法

当 p-1 是光滑数（所有质因子都很小）时，可以高效求解离散对数：

```python
from sympy.ntheory.modular import crt

def pohlig_hellman(g, A, p):
    """
    Pohlig-Hellman 算法
    要求 p-1 的所有质因子都较小
    """
    from sympy import factorint
    factors = factorint(p - 1)

    remainders = []
    moduli = []

    for q, e in factors.items():
        # 在 q^e 阶子群中求解
        q_power = q ** e
        g_sub = pow(g, (p-1)//q_power, p)
        A_sub = pow(A, (p-1)//q_power, p)

        # Baby-step Giant-step 在子群中求解
        x_sub = bsgs(g_sub, A_sub, p, q_power)
        if x_sub is not None:
            remainders.append(x_sub)
            moduli.append(q_power)

    # CRT 合并
    M, x = crt(moduli, remainders)
    return x

def bsgs(g, y, p, order):
    """Baby-step Giant-step"""
    import math
    m = int(math.isqrt(order)) + 1
    table = {pow(g, j, p): j for j in range(m)}
    gm_inv = pow(pow(g, m, p), p-2, p)
    gamma = y
    for i in range(m):
        if gamma in table:
            return i * m + table[gamma]
        gamma = gamma * gm_inv % p
    return None
```

## ECDH（椭圆曲线 DH）

ECDH 是 DH 在椭圆曲线上的变体，安全性更高：

```python
# SageMath
from sage.all import *

# 使用标准曲线 P-256
p = 0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF
a = -3
b = 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B
E = EllipticCurve(GF(p), [a, b])
G = E(0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296,
      0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5)

# Alice 的私钥和公钥
a_priv = randint(1, G.order()-1)
A_pub = a_priv * G

# Bob 的私钥和公钥
b_priv = randint(1, G.order()-1)
B_pub = b_priv * G

# 共享密钥
shared_alice = a_priv * B_pub
shared_bob = b_priv * A_pub
assert shared_alice == shared_bob
```

## CTF 中的 DH 题型

### 题型1：弱质数

```python
# 题目给出 p, g, A（Alice 的公钥），要求恢复私钥 a
# 检查 p-1 是否光滑
from sympy import factorint
factors = factorint(p - 1)
max_factor = max(factors.keys())
print(f"最大质因子：{max_factor}")
# 如果 max_factor < 10^6，用 Pohlig-Hellman
```

### 题型2：重用私钥

```python
# 如果 Alice 在多次会话中重用私钥 a
# 攻击者可以通过多次交互确认 a 的值
# 或者如果两次使用不同的 g，可以联立方程
```

### 题型3：参数可控

```python
# 如果攻击者可以控制 g 或 p
# 发送 g = 1：A = 1^a = 1，共享密钥 = 1^b = 1
# 发送 g = p-1：A = (p-1)^a mod p，只有两种可能值（1 或 p-1）
# 发送 p = 1：所有运算结果为 0
```

## 练手资源

- Cryptopals Set 5 — DH 相关挑战
- CTFHub 密码学 DH 系列
- [CryptoHack](https://cryptohack.org/) — 专注密码学的 CTF 平台，有大量 DH 题目

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

- [密钥交换的漏洞](http://172.16.173.140/training/11?challenge=72) — g 的阶太小，暴力求解离散对数恢复共享密钥
