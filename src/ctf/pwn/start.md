---
title: 起步——配置环境
order: 1
index: true
icon: charm:binary
category:
  - CTF
  - Pwn
---

工欲善其事，必先利其器。Pwn 需要的工具不多，但少一个都可能卡壳。

<!-- more -->

## 你需要一台 Linux

绝大部分 Pwn 题都是 Linux 程序。用虚拟机或实体机都行。

- **虚拟机方案**：VirtualBox（免费）+ Ubuntu 22.04 LTS
- **实体机方案**：直接装 Ubuntu，或者像笔者一样日用 Arch Linux

随便选一个。后面的步骤都假设你在 Linux 上操作。

## 工具安装

### 1. Python + Pwntools

```bash
sudo apt update
sudo apt install python3 python3-pip -y
pip3 install pwntools
```

验证：
```python
python3 -c "from pwn import *; print('OK')"
```

### 2. GDB + Pwndbg

```bash
sudo apt install gdb -y

# 安装 pwndbg 插件
git clone https://github.com/pwndbg/pwndbg
cd pwndbg
./setup.sh
```

安装完后，启动 `gdb` 应该会看到 pwndbg 的彩色界面。

### 3. Checksec

```bash
pip3 install checksec
```

用 `checksec ./vuln` 查看程序的保护机制：
- **Canary**：栈保护，防止溢出
- **NX**：栈上不可执行
- **PIE**：地址随机化
- **RELRO**：GOT 表保护

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

在泄露了 libc 基址后，用来在线查找对应的 libc 版本。

### 6. glibc-all-in-one（可选）

```bash
git clone https://github.com/matrix1001/glibc-all-in-one.git
cd glibc-all-in-one
./download 2.31-0ubuntu9.7_amd64   # 下载题目常用的版本
```

做堆题时经常需要不同版本的 libc 和 ld。

### 7. IDA Pro

用于分析二进制文件逻辑。没有免费的替代品推荐 Ghidra（NSA 开源的），但入门阶段用 IDA 更友好。安装方法请自行搜索。

## 验证环境

写一个简单的溢出程序测试：

```c
// test.c
#include <stdio.h>
void win() { system("/bin/sh"); }
void vuln() { char buf[16]; gets(buf); }
int main() { vuln(); return 0; }
```

```bash
gcc -fno-stack-protector -no-pie -o test test.c
checksec ./test
```

然后写一个 pwntools 脚本连上去。如果能 shell，环境就 OK 了。

## 练手去处

环境搭好后，去 CTFHub 的 Pwn 技能树或攻防世界找 ret2text 的题开始打。先本地打通，再打远程。
