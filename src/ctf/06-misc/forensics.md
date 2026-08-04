---
title: 磁盘与内存取证
order: 6
icon: mdi:harddisk
category:
  - CTF
  - 手册
  - Misc
---

取证题给你一个磁盘镜像或内存转储文件，要求从中找出 Flag 或还原攻击者的操作。

## 磁盘取证

### 挂载磁盘镜像

```bash
# 查看镜像分区信息
fdisk -l disk.img
mmls disk.img   # 用 sleuthkit

# 挂载特定分区（偏移量 = 起始扇区 × 512）
mount -o loop,offset=1048576 disk.img /mnt/disk

# 或者用 kpartx 自动挂载所有分区
kpartx -av disk.img
mount /dev/mapper/loop0p1 /mnt/disk
```

### 文件系统分析（Autopsy / Sleuthkit）

```bash
# 列出文件系统中的文件（包括已删除的）
fls -r disk.img

# 提取特定文件（用 inode 号）
icat disk.img 12345 > recovered_file

# 搜索关键词
grep -r "flag" /mnt/disk
strings disk.img | grep -i "flag{"
```

### 恢复已删除文件

```bash
# foremost：按文件头特征恢复
foremost -i disk.img -o output/

# photorec：图形界面，支持更多格式
photorec disk.img
```

## 内存取证（Volatility）

Volatility 是内存取证的标准工具，支持 Windows/Linux/macOS 内存镜像。

### 基础命令

```bash
# Volatility 2（旧版，用于 Windows XP/7）
volatility -f memory.dump imageinfo   # 识别系统版本
volatility -f memory.dump --profile=Win7SP1x64 pslist   # 进程列表

# Volatility 3（新版，自动识别系统）
vol -f memory.dump windows.info
vol -f memory.dump windows.pslist
```

### 进程分析

```bash
# 进程列表（树形）
vol -f memory.dump windows.pstree

# 查找可疑进程（隐藏进程）
vol -f memory.dump windows.psscan   # 扫描内存中的 EPROCESS 结构

# 查看进程的命令行参数
vol -f memory.dump windows.cmdline

# 查看进程加载的 DLL
vol -f memory.dump windows.dlllist --pid 1234
```

### 文件提取

```bash
# 列出内存中的文件
vol -f memory.dump windows.filescan | grep -i flag

# 提取文件（用物理地址）
vol -f memory.dump windows.dumpfiles --physaddr 0x1234567

# 提取进程内存
vol -f memory.dump windows.memmap --pid 1234 --dump
```

### 网络连接

```bash
# 查看网络连接（包括已关闭的）
vol -f memory.dump windows.netstat
vol -f memory.dump windows.netscan
```

### 注册表分析

```bash
# 列出注册表 hive
vol -f memory.dump windows.registry.hivelist

# 打印注册表键值
vol -f memory.dump windows.registry.printkey --key "SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
```

### 提取密码哈希

```bash
# 提取 SAM 数据库中的密码哈希
vol -f memory.dump windows.hashdump
# 然后用 hashcat 或 john 破解
```

## Linux 内存取证

```bash
# 进程列表
vol -f memory.dump linux.pslist

# bash 历史记录（直接从内存恢复）
vol -f memory.dump linux.bash

# 网络连接
vol -f memory.dump linux.netstat
```

## 常用工具汇总

```bash
# 安装 Volatility 3
pip3 install volatility3

# 安装 Sleuthkit
sudo apt install sleuthkit autopsy

# 安装 foremost
sudo apt install foremost
```

## 练手资源

- CTFHub 取证技能树
- 攻防世界 Misc 取证题
- MemLabs（GitHub）— 专门的内存取证 CTF 练习
