---
title: 环境搭建
order: 1
icon: mdi:wrench-outline
category:
  - CTF
  - 手册
  - Pwn
---

Pwn 需要的工具不多，但少一个都可能卡壳。本节帮你一次性把环境配好。

## 你需要一台 Linux

绝大部分 Pwn 题都是 Linux 程序。推荐用虚拟机方案：**VirtualBox + Ubuntu 22.04 LTS**。

安装方法见[通用基础 → Linux 环境搭建](../01-basics/linux-setup.md)。

## 工具安装

### 1. Python + Pwntools

```bash
sudo apt update
sudo apt install python3 python3-pip -y
pip3 install pwntools
```

验证：

```bash
python3 -c "from pwn import *; print('OK')"
```

### 2. GDB + Pwndbg

```bash
sudo apt install gdb -y

git clone https://github.com/pwndbg/pwndbg
cd pwndbg
./setup.sh
```

安装完后，启动 `gdb` 应该会看到 pwndbg 的彩色界面。

### 3. Checksec

pwntools 自带 `checksec` 命令，无需额外安装。

用 `pwn checksec ./vuln` 或 `checksec ./vuln` 查看程序的保护机制：

| 保护 | 含义 |
|------|------|
| Canary | 栈保护，防止溢出 |
| NX | 栈上不可执行 |
| PIE | 代码段地址随机化 |
| RELRO | GOT 表保护 |

### 4. ROPgadget

```bash
pip3 install ROPgadget
```

用 `ROPgadget --binary ./vuln` 列出所有可用的 gadget。

### 5. LibcSearcher

```bash
git clone https://github.com/lieanu/LibcSearcher.git
cd LibcSearcher
pip3 install -e .
```

在泄露了 libc 函数地址后，用来查找对应的 libc 版本。

### 6. glibc-all-in-one（可选，堆题用）

```bash
git clone https://github.com/matrix1001/glibc-all-in-one.git
cd glibc-all-in-one
./download 2.31-0ubuntu9.7_amd64
```

## 验证环境

写一个简单的溢出程序测试：

```c
// test.c
#include <stdio.h>
#include <stdlib.h>
void win() { system("/bin/sh"); }
void vuln() { char buf[16]; gets(buf); }
int main() { vuln(); return 0; }
```

```bash
gcc -fno-stack-protector -no-pie -o test test.c
checksec ./test
```

然后写一个 pwntools 脚本连上去，能拿到 shell 就说明环境 OK 了。

## GDB 常用命令速查

```bash
gdb ./binary

b main          # 在 main 函数下断点
b *0x401234     # 在地址下断点
r               # 运行程序
ni              # 单步（不进入函数）
si              # 单步（进入函数）
c               # 继续执行到下一个断点
x/20gx $rsp     # 查看栈上 20 个 8 字节值
x/s $rax        # 查看 rax 指向的字符串
p $rdi          # 打印寄存器值
info registers  # 查看所有寄存器
```

::: tip
Pwndbg 在 GDB 基础上增加了 `context`（每步自动显示寄存器+栈+代码）、`cyclic`、`checksec` 等命令，调试体验好很多。
:::
