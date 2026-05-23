---
title: 流密码攻击
order: 5
icon: mdi:waves
category:
  - CTF
  - 手册
  - Crypto
---

流密码逐字节加密数据，常见的有 RC4 和基于线性反馈移位寄存器（LFSR）的密码。

## RC4

RC4 是最常见的流密码，CTF 中经常出现。

### 算法原理

```python
def rc4(key, data):
    # KSA（密钥调度算法）
    S = list(range(256))
    j = 0
    for i in range(256):
        j = (j + S[i] + key[i % len(key)]) % 256
        S[i], S[j] = S[j], S[i]

    # PRGA（伪随机生成算法）
    i = j = 0
    keystream = []
    for _ in range(len(data)):
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]
        keystream.append(S[(S[i] + S[j]) % 256])

    return bytes(a ^ b for a, b in zip(data, keystream))

# RC4 加密和解密是同一个操作
plaintext = rc4(b"key", ciphertext)
```

### 密钥重用攻击

**场景**：两段不同的明文用相同的密钥加密。

```
C1 = P1 XOR KS
C2 = P2 XOR KS

C1 XOR C2 = P1 XOR P2
```

知道了 `P1 XOR P2`，如果能猜出 P1 的部分内容（比如已知是英文文本），就能推出 P2 的对应部分。

```python
# 已知两段密文，密钥相同
c1 = bytes.fromhex("...")
c2 = bytes.fromhex("...")

xored = bytes(a ^ b for a, b in zip(c1, c2))

# 如果知道 P1 的部分内容
known_p1 = b"Hello, "
partial_p2 = bytes(a ^ b for a, b in zip(xored, known_p1))
print(partial_p2)  # 得到 P2 的前 7 个字节
```

## MT19937（梅森旋转）

Python 的 `random` 模块使用 MT19937 算法，这是一个伪随机数生成器，**不适合用于密码学**。

### 预测随机数

MT19937 的内部状态由 624 个 32 位整数组成。观察 624 个连续输出后，可以完全恢复内部状态，预测后续所有输出。

```python
# 题目场景：服务器用 random.getrandbits(32) 生成 token
# 你能观察到 624 个 token，然后预测下一个

from randcrack import RandCrack

rc = RandCrack()
for _ in range(624):
    # 从服务器获取 32 位随机数
    value = get_token_from_server()
    rc.submit(value)

# 预测下一个随机数
predicted = rc.predict_getrandbits(32)
```

```bash
pip install randcrack
```

### time() 作为种子

```python
import random, time

# 如果程序用当前时间作为种子
random.seed(int(time.time()))

# 攻击：枚举最近几秒的时间戳
import time
target_time = int(time.time())
for seed in range(target_time - 100, target_time + 1):
    random.seed(seed)
    if random.getrandbits(32) == observed_value:
        print(f"Found seed: {seed}")
        break
```

## LFSR（线性反馈移位寄存器）

LFSR 是一种简单的流密码，常出现在 CTF 中。

```python
def lfsr(state, mask, n):
    """
    state: 初始状态（整数）
    mask: 反馈多项式（整数）
    n: 输出位数
    """
    output = []
    for _ in range(n):
        output.append(state & 1)  # 输出最低位
        # 计算反馈位
        feedback = bin(state & mask).count('1') % 2
        state = (state >> 1) | (feedback << (state.bit_length() - 1))
    return output
```

**破解 LFSR**：已知足够多的输出位，可以用 Berlekamp-Massey 算法恢复反馈多项式。

```python
# 使用 SageMath
from sage.all import *
F = GF(2)
berlekamp_massey([F(b) for b in known_bits])
```

## 练手资源

- CTFHub 流密码技能树
- 攻防世界 Crypto 中级题
