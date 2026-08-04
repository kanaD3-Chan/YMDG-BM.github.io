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
| Burp Suite | [官网下载](https://portswigger.net/burp/communitydownload)（社区版免费；Pro 版找学长要或翻实验室网盘） | 抓包、改包、重放 |
| HackBar | Firefox 插件商店 | 快速修改参数 |
| Sqlmap | `pip3 install sqlmap` | 自动化 SQL 注入 |
| Dirsearch | `pip3 install dirsearch` | 目录扫描 |
| 蚁剑（AntSword） | [GitHub](https://github.com/AntSwordProject/antSword) | WebShell 管理 |

## 逆向方向

| 工具 | 安装方式 | 用途 |
|------|----------|------|
| IDA Pro | 找学长要，或翻实验室网盘（付费） | 静态反汇编/反编译 |
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

在线/本地工具：
- [CyberChef](https://gchq.github.io/CyberChef/) — 编码/解码/加密
- [FactorDB](http://factordb.com/) — 大整数分解数据库
- [dCode](https://www.dcode.fr/) — 古典密码在线解密
- [Ciphey](https://github.com/Ciphey/Ciphey) — 自动化解密，识别常见编码和古典密码
- [Yafu](https://sourceforge.net/projects/yafu/) — 本地大数分解工具

## Misc 方向

```bash
sudo apt install -y binwalk foremost exiftool steghide wireshark
pip3 install pillow

# zsteg（PNG 隐写检测，需要 Ruby）
sudo apt install ruby
gem install zsteg
```

MISC 综合解题工具：
- [随波逐流](http://1o1o.xyz/index.html) — 离线加解密、编码转换、隐写查看
- [PuzzleSolver](https://github.com/Byxs20/PuzzleSolver) — MISC 综合解题工具

Windows 工具：
- [010 Editor](https://www.sweetscape.com/010editor/) — 十六进制编辑器（付费，找学长要或翻实验室网盘）
- [ImHex](https://github.com/WerWolv/ImHex) — 开源十六进制编辑器（010 Editor 的免费替代）
- [Audacity](https://www.audacityteam.org/) — 音频频谱分析
- [Volatility](https://www.volatilityfoundation.org/) — 内存取证

## AWD 方向

AWD 拼的就是通防脚本和手速：

| 工具 | 地址 | 用途 |
|------|------|------|
| evilPatcher | https://github.com/TTY-flag/evilPatcher | Pwn 题通防 |
| AoiAWD | https://github.com/DasSecurity-HatLab/AoiAWD | Web 题通防 |
| 0E7 | https://github.com/huangzheng2016/0E7 | AWD 工具箱 |
| S4DFarm | https://github.com/C4T-BuT-S4D/S4DFarm | Flag 管理 |

## 在线平台

| 平台 | 地址 | 用途 |
|------|------|------|
| 本地靶场 | `http://172.16.173.140/`（校园网） | 校内原创题目 |
| CTFHub | https://www.ctfhub.com/ | 技能树刷题 |
| 攻防世界 | https://adworld.xctf.org.cn/ | 综合刷题 |
| Hello-CTF | https://hello-ctf.com/ | 开源 CTF 指南 |
| 极核 | https://get-shell.com/ | 工具与资源 |

## Hello-CTF 生态资源

[Hello-CTF](https://hello-ctf.com/) 是面向零基础新手的开源 CTF 教程，它周边有几个项目也值得收藏：

| 资源 | 地址 | 用途 |
|------|------|------|
| Hello-CTFtime 赛事日历 | https://hello-ctf.com/Event/ | 国内外 CTF 赛事聚合，自动化更新，打比赛前先看这里 |
| 工具 / MCP 合集 | https://hello-ctf.com/sidebar/tools.html | 全方向工具搜索，支持关键词筛选 |
| CTF 技能树 | https://hello-ctf.com/sidebar/ctf-skill.html | 按方向查知识点（本站附录有整理版：[技能树](./skill-tree)） |
| 历史比赛附件 | https://hello-ctf.com/sidebar/archives.html | CTF-Archives 收录的历届比赛附件归档 |
| CTFtools-wiki | https://hello-ctf.com/hc-toolkit/ | CTF 工具百科，按 Web/Misc/Crypto/Reverse/Pwn/AWD 分类，带下载地址和使用文档 |
| NSSCTF | https://www.nssctf.cn/ | Hello-CTF 的配套刷题平台，教程里的题可以直接在上面开 |
| CTF-OS | https://github.com/ProbiusOfficial/CTF-OS | 开箱即用的 CTF 环境镜像，不想自己折腾虚拟机环境可以试试 |

::: tip
工具不用 All In，用到什么装什么。更多冷门工具和轮子去 CTFtools-wiki 翻，比自己瞎搜快。
:::
