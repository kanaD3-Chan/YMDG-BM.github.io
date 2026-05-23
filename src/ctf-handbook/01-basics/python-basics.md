---
title: Python 基础
order: 3
icon: logos:python
category:
  - CTF
  - 手册
---

CTF 中大量的脚本工作都用 Python 完成——自动化爆破、解密脚本、漏洞利用脚本。你不需要精通 Python，但需要能看懂和写出基本的脚本。

## 安装 Python

Ubuntu 22.04 已经预装了 Python 3。验证：

```bash
python3 --version
pip3 --version
```

## 基础语法速览

### 变量与数据类型

```python
# 数字
n = 42
pi = 3.14

# 字符串
s = "hello"
s2 = 'world'

# 列表
lst = [1, 2, 3, "a", "b"]

# 字典
d = {"name": "Alice", "age": 20}

# 字节串（CTF 中非常常用）
b = b"hello"          # 字节串字面量
b2 = bytes([72, 101]) # 从整数列表创建
```

### 条件与循环

```python
# 条件
if x > 0:
    print("正数")
elif x == 0:
    print("零")
else:
    print("负数")

# for 循环
for i in range(10):
    print(i)

for char in "hello":
    print(char)

# while 循环
while condition:
    do_something()
```

### 函数

```python
def add(a, b):
    return a + b

result = add(3, 4)  # result = 7
```

### 字符串操作

```python
s = "Hello, World!"

s.upper()           # "HELLO, WORLD!"
s.lower()           # "hello, world!"
s.split(", ")       # ["Hello", "World!"]
s.replace("o", "0") # "Hell0, W0rld!"
len(s)              # 13

# 格式化字符串
name = "Alice"
f"Hello, {name}!"   # "Hello, Alice!"
```

### 字节与整数转换（CTF 核心操作）

```python
# 字节转整数
int.from_bytes(b"\x41\x42", "big")   # 16706 (大端序)
int.from_bytes(b"\x41\x42", "little") # 16961 (小端序)

# 整数转字节
(16706).to_bytes(2, "big")   # b'\x41\x42'

# 字符与 ASCII 码互转
ord("A")   # 65
chr(65)    # "A"

# 十六进制字符串转字节
bytes.fromhex("4142")  # b'AB'
b"AB".hex()            # "4142"
```

### 文件操作

```python
# 读文件
with open("flag.txt", "r") as f:
    content = f.read()

# 写文件
with open("output.txt", "w") as f:
    f.write("hello\n")

# 读二进制文件
with open("binary.bin", "rb") as f:
    data = f.read()
```

## CTF 常用库

### requests（HTTP 请求）

```bash
pip3 install requests
```

```python
import requests

# GET 请求
r = requests.get("http://example.com/page?id=1")
print(r.status_code)  # 200
print(r.text)         # 响应内容

# POST 请求
r = requests.post("http://example.com/login", data={
    "username": "admin",
    "password": "123456"
})

# 带 Cookie
r = requests.get(url, cookies={"session": "abc123"})

# 带 Header
r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
```

### pwntools（Pwn 方向必备）

```bash
pip3 install pwntools
```

```python
from pwn import *

# 连接本地程序
p = process("./vuln")

# 连接远程
p = remote("challenge.example.com", 9999)

# 发送数据
p.sendline(b"hello")
p.send(b"hello")  # 不带换行

# 接收数据
data = p.recv(1024)
data = p.recvuntil(b"prompt: ")
data = p.recvline()

# 进入交互模式
p.interactive()

# 打包整数（小端序）
p64(0xdeadbeef)  # 8字节
p32(0xdeadbeef)  # 4字节
```

### PyCryptodome（密码学）

```bash
pip3 install pycryptodome
```

```python
from Crypto.Util.number import long_to_bytes, bytes_to_long, inverse

# 大数转字节（RSA 解密后还原明文）
long_to_bytes(12345678)

# 字节转大数
bytes_to_long(b"hello")

# 模逆元（RSA 求 d）
inverse(e, phi)
```

## 一个完整的 CTF 脚本示例

下面是一个典型的 Web 爆破脚本：

```python
import requests

url = "http://challenge.example.com/login"

# 尝试常见密码
passwords = ["123456", "password", "admin", "flag", "ctf"]

for pwd in passwords:
    r = requests.post(url, data={
        "username": "admin",
        "password": pwd
    })
    if "Welcome" in r.text:
        print(f"找到密码: {pwd}")
        break
    else:
        print(f"尝试 {pwd}: 失败")
```

::: tip 推荐学习资源
- [菜鸟教程 Python3](https://www.runoob.com/python3/python3-tutorial.html) — 快速入门
- [廖雪峰的 Python 教程](https://liaoxuefeng.com/books/python/introduction/index.html) — 更系统
:::
