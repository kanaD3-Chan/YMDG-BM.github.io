---
title: 密码学攻击参考
icon: streamline-ultimate:crypto-encryption-key-bold
order: 4
category:
  - Wiki
  - CTF
---

CTF 密码学的核心：理解加密算法的数学结构，找到参数选择或实现中的漏洞。

<!-- more -->

## 基础数学公式

| 概念 | 公式 | Python |
|---|---|---|
| 模逆元 | $d \equiv e^{-1} \pmod{\varphi(n)}$ | `pow(e, -1, phi)` 或 `inverse(e, phi)` |
| 大数幂 | $m = c^d \bmod n$ | `pow(c, d, n)` |
| 扩展欧几里得 | $ax + by = \gcd(a,b)$ | `g, x, y = gcdext(a, b)` |
| 中国剩余定理 | $x \equiv a_i \pmod{n_i}$ | `crt([n1,n2], [c1,c2])` |
| 整数开方 | $m = \sqrt[e]{c}$ | `iroot(c, e)` |

## RSA 攻击决策树

```mermaid
flowchart TD
    A[RSA 题目] --> B{n 能分解?}
    B -->|是| B1[FactorDB / yafu 分解]
    B -->|否| C{多组 e, 相同 n?}
    C -->|是| C1[共模攻击]
    C -->|否| D{e 很小 (3/5/17)?}
    D -->|是且多组| D1[广播攻击 CRT]
    D -->|否| E{e 异常大?}
    E -->|是| E1[维纳攻击 Wiener]
    E -->|否| F{p 和 q 很接近?}
    F -->|是| F1[Fermat 分解]
    F -->|否| G{有额外信息?}
    G -->|dp/dq 泄露| G1[dp 泄露攻击]
    G -->|d < n^0.25| E1
```

## RSA 攻击公式与代码

### 1. 直接分解 n

```python
from Crypto.Util.number import inverse, long_to_bytes

# 已知 p, q, e, c
phi = (p - 1) * (q - 1)
d = inverse(e, phi)
m = pow(c, d, n)
print(long_to_bytes(m))
```

### 2. 共模攻击

条件：**相同 n、不同 e、相同 m**，且 $\gcd(e_1, e_2) = 1$

```python
g, s1, s2 = gcdext(e1, e2)  # e1*s1 + e2*s2 = 1
m = (pow(c1, s1, n) * pow(c2, s2, n)) % n
```

### 3. 广播攻击

条件：**相同 e、不同 n、相同 m**，且加密份数 ≥ e

```python
M = crt([n1, n2, n3], [c1, c2, c3])[0]
m, exact = iroot(M, e)  # e=3 时开立方
if exact: print(long_to_bytes(m))
```

### 4. 维纳攻击

条件：$d < \frac{1}{3} n^{1/4}$（此时 e 通常很大，接近 n）

```python
from owiener import attack
d = attack(e, n)
m = pow(c, d, n)
```

### 5. 小指数 p-1 光滑

条件：$p-1$ 的因子都很小（smooth）

```python
# pollard_pm1 方法，或直接用 RsaCtfTool
from Crypto.Util.number import GCD
a = 2
for i in range(2, 100000):
    a = pow(a, i, n)
    g = GCD(a - 1, n)
    if g != 1 and g != n:
        p = g; break
```

## 常见编码与古典密码

| 编码 | 特征 | 工具 |
|---|---|---|
| Base64 | `A-Za-z0-9+/=` | `base64 -d` / CyberChef |
| Base32 | `A-Z2-7=` | CyberChef |
| Hex | `0-9a-f` | `xxd -r -p` / `bytes.fromhex()` |
| ROT13 | 字母位移 13 | 凯撒密码特例 |
| 摩斯密码 | `.` 和 `-` | CyberChef |
| 栅栏密码 | 按 N 列重排 | CyberChef |
| 维吉尼亚 | 密钥循环异或 | 需找密钥长度（重合指数法） |

## SageMath 速查

SageMath 是 Crypto 的终极工具，基于 Python 语法但内置了丰富的数学能力。

```python
# 在 .sage 文件中或 sage 交互环境
F = GF(p)                        # 有限域 GF(p)
x = F(2) ** -1                   # 域中求逆

E = EllipticCurve(GF(p), [a, b]) # 椭圆曲线
P = E(x, y)
Q = n * P                        # 标量乘法

# 格（Lattice）—— 进阶必备
M = Matrix(ZZ, [[...]])
M.LLL()                          # LLL 格基约简

# 离散对数
discrete_log(h, g)               # 求 x 使得 g^x = h
```

## 常见对称密码特征

| 算法 | 分组大小 | 密钥 | 常考方向 |
|---|---|---|---|
| AES-128 | 128 bit | 128 bit | ECB 重放、CBC 字节翻转、Padding Oracle |
| DES | 64 bit | 56 bit | 弱密钥、暴力破解（已可破） |
| RC4 | 流密码 | 可变 | 流密码密钥重用（XOR 抵消） |

## 工具速查

| 工具 | 用途 |
|---|---|
| SageMath | 数学环境（格、椭圆曲线、离散对数） |
| RsaCtfTool | RSA 一键攻击集合 |
| FactorDB | 在线大整数分解数据库 |
| yafu | 本地大整数分解 |
| CyberChef | 在线编码/解码/加密瑞士军刀 |
| PyCryptodome | Python 密码学库 |

## 交叉引用

- [逆向工程参考](./reverse.md) — 识别加密算法后如何逆向
- [Web安全速查](./web.md) — Padding Oracle 等 Web+密码学交叉题
