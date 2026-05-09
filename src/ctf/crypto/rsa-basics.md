---
title: RSA基础——从公钥私钥到第一道攻击
order: 1
category:
  - CTF
  - Crypto
icon: streamline-ultimate:crypto-encryption-key-bold
---

RSA 是 CTF 密码学里出现频率最高的非对称加密算法。入门 Crypto，第一件事就是搞懂 RSA 的基本数学原理和几种基础攻击。

<!-- more -->

## RSA 是怎么工作的

### 生成密钥

1. 选两个大质数 `p` 和 `q`
2. `n = p × q`
3. `φ(n) = (p-1) × (q-1)`
4. 选一个 `e`（通常是 65537），满足 `gcd(e, φ(n)) = 1`
5. 算 `d`，满足 `d × e ≡ 1 (mod φ(n))`

**公钥**：`(n, e)` — 用来加密，谁都能知道
**私钥**：`(d)` — 用来解密，只能你知道

### 加解密

- 加密：`c = m^e mod n`
- 解密：`m = c^d mod n`

数学保证是欧拉定理：`m^(ed) ≡ m (mod n)`。

### 一个迷你例子

```
p = 3, q = 11
n = 3 × 11 = 33
φ(n) = 2 × 10 = 20
e = 3
d = 7   (因为 3 × 7 = 21 ≡ 1 mod 20)

加密 m=4:  c = 4³ mod 33  = 64 mod 33  = 31
解密 c=31: m = 31⁷ mod 33 = 4  ✓
```

::: tip 理解 RSA 的捷径
**用 Python 自己实现一遍。** 从选素数、算公私钥，到加密解密，每个步骤用代码写出来。抄一遍胜过读十遍。
:::

## 基础攻击一：直接分解 n

如果 `n` 比较小（128 位以下），可以直接分解成 `p × q`。

```python
from factordb.factordb import FactorDB

n = 9843207923081317168130298129  # 题目给的 n
f = FactorDB(n)
f.connect()
p, q = f.get_factor_list()
print(f"p = {p}, q = {q}")
```

FactorDB 是一个在线的大整数分解数据库。小于 256 位的 n 大概率有记录。

有了 `p` 和 `q`，直接算私钥：

```python
from Crypto.Util.number import inverse, long_to_bytes

e = 65537
phi = (p - 1) * (q - 1)
d = inverse(e, phi)          # 模逆元
m = pow(c, d, n)             # 解密
print(long_to_bytes(m))      # 把数字转成字符串
```

## 基础攻击二：共模攻击

同一个明文 `m`，用**相同的 n** 但**不同的 e** 加密了两份密文 `c1` 和 `c2`。且 `e1` 和 `e2` 互质。

核心公式：`e1 × s1 + e2 × s2 = 1`（扩展欧几里得算法）

```python
from Crypto.Util.number import inverse, long_to_bytes
from gmpy2 import gcdext

# 已知 n, e1, e2, c1, c2
g, s1, s2 = gcdext(e1, e2)  # g = 1 (如果 e1, e2 互质)
m = (pow(c1, s1, n) * pow(c2, s2, n)) % n
print(long_to_bytes(m))
```

::: details 为什么这能工作？

```
c1 = m^e1 mod n
c2 = m^e2 mod n

m = m^(e1×s1 + e2×s2) mod n
  = (m^e1)^s1 × (m^e2)^s2 mod n
  = c1^s1 × c2^s2 mod n
```
:::

## 基础攻击三：小指数广播攻击

同一条消息 `m` 用**不同的 n** 但**相同的 e** 加密了多份。如果 `e` 比较小（比如 3），而加密份数 ≥ e，就可以用**中国剩余定理（CRT）**恢复 `m`。

```python
from sympy.ntheory.modular import crt
from gmpy2 import iroot
from Crypto.Util.number import long_to_bytes

# 已知 3 组 (n1, c1), (n2, c2), (n3, c3)，e = 3
n_list = [n1, n2, n3]
c_list = [c1, c2, c3]

M, _ = crt(n_list, c_list)  # CRT 求解
m, exact = iroot(M, 3)       # 开立方根
if exact:
    print(long_to_bytes(m))
```

原理：`m^3 < n1 × n2 × n3` 时，`m^3 mod (n1×n2×n3)` 就只是 `m^3` 本身。直接开立方根即可。

## 基础攻击四：维纳攻击（Wiener's Attack）

当私钥 `d` 比较小（`d < n^(1/4) / 3`）时，可以用连分数逼近恢复 `d`。

```python
from owiener import attack

d = attack(e, n)  # 一行代码
if d:
    m = pow(c, d, n)
    print(long_to_bytes(m))
```

`owiener` 是现成的 Python 库。原理基于连分数——你不用手推，但要知道什么时候用它：题目给的 `e` 异常大（接近 n 的数量级）时，大概率是维纳攻击。

## 实战套路

拿到一道 RSA 题，按这个顺序排查：

1. **n 能不能分解？** → FactorDB 查一下
2. **有没有多个 e？** → 判断是否共模攻击
3. **e 是不是很小（3 或 5）？** → 判断是否广播攻击
4. **e 是不是异常大？** → 判断是否维纳攻击
5. **p 和 q 是不是太近？** → Fermat 分解（`|p-q|` 很小的时候）
6. **有没有给额外的信息？** → dp、dq 等泄露（进阶内容）

## 工具清单

```bash
pip install pycryptodome gmpy2 sympy owiener
```

在线资源：

- [FactorDB](http://factordb.com/) — 查大整数分解结果
- [SageMath](https://www.sagemath.org/) — 数学软件包，Crypto 方向的终极武器
- RsaCtfTool — 集成了各种 RSA 攻击，但学好基础再用它

## 练手去哪

- CTFHub 的 Crypto 技能树 — 从古典密码到 RSA 都有
- 攻防世界 Crypto 新手区
- **自己写一遍 RSA 的密钥生成和加解密**（只用 Python，不调库）

## 一句话

RSA 的安全性建立在"大整数分解很难"上。CTF 中所有的 RSA 攻击，本质上都是在找能绕过这个假设的方法——n 太小能分解、d 太小能用连分数、加密次数太多能用 CRT。
