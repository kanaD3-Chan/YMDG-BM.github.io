---
title: 工具安装清单
order: 1
icon: mdi:tools
category:
  - CTF
  - 手册
---

## 通用工具

```bash
# 系统工具
sudo apt install -y \
    python3 python3-pip \
    git curl wget \
    gdb \
    binwalk foremost \
    wireshark \
    file xxd strings \
    exiftool \
    steghide

# Python 库
pip3 install \
    pwntools \
    requests \
    pycryptodome \
    gmpy2 \
    sympy \
    owiener \
    pillow \
    ROPgadget \
    checksec
```

## Web 方向

| 工具 | 安装方式 | 用途 |
|------|----------|------|
| Burp Suite | [官网下载](https://portswigger.net/burp/communitydownload) | 抓包、改包、重放 |
| HackBar | Firefox 插件商店 | 快速修改参数 |
| Sqlmap | `pip3 install sqlmap` | 自动化 SQL 注入 |
| Dirsearch | `pip3 install dirsearch` | 目录扫描 |
| 蚁剑（AntSword） | [GitHub](https://github.com/AntSwordProject/antSword) | WebShell 管理 |

## 逆向方向

| 工具 | 安装方式 | 用途 |
|------|----------|------|
| IDA Pro | 自行搜索 | 静态反汇编/反编译 |
| Ghidra | [官网下载](https://ghidra-sre.org/) | 免费替代 IDA |
| x64dbg | [官网下载](https://x64dbg.com/) | Windows 动态调试 |
| GDB + Pwndbg | 见下方 | Linux 动态调试 |

```bash
# 安装 GDB + Pwndbg
sudo apt install gdb -y
git clone https://github.com/pwndbg/pwndbg
cd pwndbg && ./setup.sh
```

## Pwn 方向

```bash
pip3 install pwntools ROPgadget checksec

# LibcSearcher（泄露 libc 基址后查版本）
git clone https://github.com/lieanu/LibcSearcher.git
cd LibcSearcher && pip3 install -e .

# glibc-all-in-one（堆题用，可选）
git clone https://github.com/matrix1001/glibc-all-in-one.git
```

## 密码学方向

```bash
pip3 install pycryptodome gmpy2 sympy owiener

# SageMath（处理格、椭圆曲线等高级数学）
sudo apt install sagemath
```

在线工具：
- [CyberChef](https://gchq.github.io/CyberChef/) — 编码/解码/加密
- [FactorDB](http://factordb.com/) — 大整数分解数据库
- [dCode](https://www.dcode.fr/) — 古典密码在线解密

## Misc 方向

```bash
sudo apt install -y binwalk foremost exiftool steghide wireshark
pip3 install pillow

# zsteg（PNG 隐写检测，需要 Ruby）
sudo apt install ruby
gem install zsteg
```

Windows 工具：
- [010 Editor](https://www.sweetscape.com/010editor/) — 十六进制编辑器
- [Audacity](https://www.audacityteam.org/) — 音频频谱分析
- [Volatility](https://www.volatilityfoundation.org/) — 内存取证

## 在线平台

| 平台 | 地址 | 用途 |
|------|------|------|
| 本地靶场 | `http://172.16.173.140/`（校园网） | 校内原创题目 |
| CTFHub | https://www.ctfhub.com/ | 技能树刷题 |
| 攻防世界 | https://adworld.xctf.org.cn/ | 综合刷题 |
| Hello-CTF | https://hello-ctf.com/ | 开源 CTF 指南 |
| 极核 | https://get-shell.com/ | 工具与资源 |
