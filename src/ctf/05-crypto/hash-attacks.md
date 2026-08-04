---
title: 哈希攻击
order: 4
icon: mdi:pound
category:
  - CTF
  - 手册
  - Crypto
---

哈希函数在 CTF 中经常出现，常见的攻击包括哈希碰撞、长度扩展攻击和彩虹表破解。

## 哈希函数基础

哈希函数把任意长度的输入映射到固定长度的输出：

```python
import hashlib

hashlib.md5(b"hello").hexdigest()     # 5d41402abc4b2a76b9719d911017c592
hashlib.sha1(b"hello").hexdigest()    # aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d
hashlib.sha256(b"hello").hexdigest()  # 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
```

理想的哈希函数应满足：
- **单向性**：无法从哈希值反推原文
- **抗碰撞性**：找不到两个不同输入有相同哈希值
- **雪崩效应**：输入微小变化导致输出大幅变化

## MD5 碰撞

MD5 已被证明存在碰撞漏洞，可以找到两个不同的输入产生相同的 MD5 值。

### 已知碰撞对

```python
# 这两段数据的 MD5 相同
a = bytes.fromhex(
    "d131dd02c5e6eec4693d9a0698aff95c2fcab58712467eab4004583eb8fb7f89"
    "55ad340609f4b30283e488832571415a085125e8f7cdc99fd91dbdf280373c5b"
    "d8823e3156348f5bae6dacd436c919c6dd53e2b487da03fd02396306d248cda0"
    "e99f33420f577ee8ce54b67080a80d1ec69821bcb6a8839396f9652b6ff72a70"
)
b = bytes.fromhex(
    "d131dd02c5e6eec4693d9a0698aff95c2fcab50712467eab4004583eb8fb7f89"
    "55ad340609f4b30283e4888325f1415a085125e8f7cdc99fd91dbd7280373c5b"
    "d8823e3156348f5bae6dacd436c919c6dd53e23487da03fd02396306d248cda0"
    "e99f33420f577ee8ce54b67080280d1ec69821bcb6a8839396f965ab6ff72a70"
)
import hashlib
assert hashlib.md5(a).hexdigest() == hashlib.md5(b).hexdigest()
```

### CTF 中的 MD5 碰撞题

```python
# 题目：要求提交两个不同的文件，MD5 相同
# 工具：fastcoll（生成 MD5 碰撞对）
# fastcoll -p prefix.bin -o out1.bin out2.bin
```

### PHP 弱类型比较

PHP 的 `==` 比较 MD5 时存在特殊情况：

```php
// 以 0e 开头的 MD5 值在 PHP 中被当作科学计数法（0 的 N 次方 = 0）
md5("240610708") = "0e462097431906509019562988736854"
md5("QNKCDZO")   = "0e830400451993494058024219903391"
// 两者 == 比较为 true！
```

常见的 `0e` 开头 MD5 值：
```
240610708, QNKCDZO, aabg7XSs, aabC9RqS, s878926199a, s155964671a, 0e215962017
```

## 哈希长度扩展攻击

**场景**：服务器用 `hash(secret + message)` 生成签名，你知道 `hash` 值和 `message`，但不知道 `secret`。

**漏洞**：MD5/SHA-1/SHA-256 使用 Merkle-Damgård 结构，可以在不知道 `secret` 的情况下，计算 `hash(secret + message + padding + extension)` 的值。

```python
# 使用 hashpumpy 库（pip install hashpumpy）
import hashpumpy

# hashpumpy.hashpump(已知hash, 已知消息, 要追加内容, secret长度)
new_hash, new_message = hashpumpy.hashpump(
    '已知hash值',        # 已知签名
    b'user=alice',       # 已知消息
    b'&admin=true',      # 要追加的内容
    16                   # secret 长度
)
print(f"新 hash: {new_hash}")
print(f"新消息: {new_message}")
```

## 彩虹表与字典攻击

当哈希值对应的原文是弱密码时，可以用彩虹表或字典直接查找：

```bash
# hashcat 字典攻击
hashcat -a 0 -m 0 hash.txt wordlist.txt    # MD5
hashcat -a 0 -m 100 hash.txt wordlist.txt  # SHA-1
hashcat -a 0 -m 1400 hash.txt wordlist.txt # SHA-256

# john the ripper
john --format=raw-md5 --wordlist=rockyou.txt hash.txt
```

在线查询：
- [cmd5.com](https://www.cmd5.com/) — MD5 在线查询
- [crackstation.net](https://crackstation.net/) — 多种哈希在线破解

## 练手资源

- CTFHub Crypto 哈希相关题目
- 攻防世界 Crypto 新手区

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

- [哈希碰撞](http://172.16.173.140/training/11?challenge=68) — PHP 弱类型 MD5 比较，利用 0e 魔法哈希绕过验证
