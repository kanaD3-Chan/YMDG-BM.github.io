---
title: RSA 攻击详解
order: 2
icon: mdi:key-chain
category:
  - CTF
  - 手册
  - Crypto
---

RSA 是 CTF 密码学里出现频率最高的算法。本节从原理出发，讲清楚四种最常见的攻击方式。

## RSA 是怎么工作的

### 密钥生成

1. 选两个大质数 `p` 和 `q`
2. `n = p × q`
3. `φ(n) = (p-1) × (q-1)`
4. 选 `e`（通常 65537），满足 `gcd(e, φ(n)) = 1`
5. 算 `d`，满足 `d × e ≡ 1 (mod φ(n))`

**公钥**：`(n, e)` — 用来加密，谁都能知道  
**私钥**：`d` — 用来解密，只能你知道

### 加解密

- 加密：`c = m^e mod n`
- 解密：`m = c^d mod n`

### 迷你例子

```
p = 3, q = 11
n = 33,  φ(n) = 20
e = 3,   d = 7  (3×7=21≡1 mod 20)

加密 m=4:  c = 4³ mod 33 = 31
解密 c=31: m = 31⁷ mod 33 = 4  ✓
```

::: tip
自己用 Python 实现一遍密钥生成和加解密，比读十遍教程都有用。
:::

## 基础解密脚本

已知 `p`、`q`、`e`、`c` 时，直接算私钥解密：

```python
from Crypto.Util.number import inverse, long_to_bytes

phi = (p - 1) * (q - 1)
d = inverse(e, phi)       # 模逆元
m = pow(c, d, n)          # 解密
print(long_to_bytes(m))   # 数字转字符串
```

## 攻击一：分解 n

如果 `n` 比较小（256 位以下），可以直接分解成 `p × q`。

```python
from factordb.factordb import FactorDB
from Crypto.Util.number import inverse, long_to_bytes

n = 9843207923081317168130298129
f = FactorDB(n)
f.connect()
p, q = f.get_factor_list()

phi = (p - 1) * (q - 1)
d = inverse(e, phi)
m = pow(c, d, n)
print(long_to_bytes(m))
```

[FactorDB](http://factordb.com/) 是在线大整数分解数据库，小于 256 位的 n 大概率有记录。

## 攻击二：共模攻击

**条件**：同一明文 `m`，用**相同的 n** 但**不同的 e** 加密了两份密文 `c1`、`c2`，且 `gcd(e1, e2) = 1`。

```python
from gmpy2 import gcdext
from Crypto.Util.number import long_to_bytes

# 已知 n, e1, e2, c1, c2
g, s1, s2 = gcdext(e1, e2)
m = (pow(c1, s1, n) * pow(c2, s2, n)) % n
print(long_to_bytes(m))
```

::: details 原理
```
e1×s1 + e2×s2 = 1  （扩展欧几里得）

m = m^(e1×s1 + e2×s2) mod n
  = c1^s1 × c2^s2 mod n
```
:::

## 攻击三：广播攻击

**条件**：同一明文 `m` 用**不同的 n** 但**相同的小 e**（如 e=3）加密了 3 份密文。

```python
from sympy.ntheory.modular import crt
from gmpy2 import iroot
from Crypto.Util.number import long_to_bytes

# 已知 (n1,c1), (n2,c2), (n3,c3)，e=3
M, _ = crt([n1, n2, n3], [c1, c2, c3])
m, exact = iroot(M, 3)
if exact:
    print(long_to_bytes(int(m)))
```

原理：当 `m^3 < n1×n2×n3` 时，CRT 求出的 M 就是 `m^3`，直接开立方根即可。

## 攻击四：维纳攻击

**条件**：私钥 `d` 很小（`d < n^(1/4) / 3`），通常表现为题目给的 `e` 异常大（接近 n 的数量级）。

```python
from owiener import attack
from Crypto.Util.number import long_to_bytes

d = attack(e, n)
if d:
    m = pow(c, d, n)
    print(long_to_bytes(m))
```

## 排查顺序

拿到 RSA 题，按顺序排查：

1. n 能不能分解？→ FactorDB 查
2. 有没有多个 e？→ 共模攻击
3. e 是不是很小（3 或 5）？→ 广播攻击
4. e 是不是异常大？→ 维纳攻击
5. p 和 q 是不是太近？→ Fermat 分解

## 工具安装

```bash
pip3 install pycryptodome gmpy2 sympy owiener
```
