---
title: 虚拟机与 Linux 环境搭建
order: 2
icon: mdi:linux
category:
  - CTF
  - 手册
---

CTF 的绝大多数工具都运行在 Linux 上。你需要先搭建一个 Linux 环境。

## 方案选择

::: tabs#vm

@tab 虚拟机（推荐新手）

在 Windows 上安装虚拟机软件，在虚拟机里运行 Linux。两个系统互不干扰，出了问题可以随时恢复快照。

**推荐组合**：VirtualBox（免费）+ Ubuntu 22.04 LTS

@tab 双系统

在电脑上同时安装 Windows 和 Linux，开机时选择进入哪个系统。性能最好，但配置稍复杂。

@tab WSL2（Windows 子系统）

在 Windows 里直接运行 Linux 命令行环境，无需重启。适合只需要命令行工具的场景，但图形界面支持有限。

:::

## 安装 VirtualBox + Ubuntu 22.04

### 第一步：下载安装 VirtualBox

1. 前往 [VirtualBox 官网](https://www.virtualbox.org/wiki/Downloads) 下载 Windows 版本
2. 双击安装包，一路下一步即可

### 第二步：下载 Ubuntu 22.04 镜像

前往 [Ubuntu 官网](https://ubuntu.com/download/desktop) 下载 Ubuntu 22.04 LTS 的 `.iso` 文件（约 4GB）。

::: tip
下载较慢时可以使用国内镜像源，比如[清华大学镜像站](https://mirrors.tuna.tsinghua.edu.cn/ubuntu-releases/22.04/)。
:::

### 第三步：创建虚拟机

1. 打开 VirtualBox，点击"新建"
2. 名称随意，类型选 **Linux**，版本选 **Ubuntu (64-bit)**
3. 内存建议分配 **4GB 以上**（4096 MB）
4. 硬盘建议 **50GB 以上**（动态分配）
5. 创建完成后，在设置 → 存储中，将下载的 `.iso` 文件挂载到光驱
6. 启动虚拟机，按照 Ubuntu 安装向导完成安装

### 第四步：安装增强功能（可选但推荐）

安装 VirtualBox 增强功能后，可以实现全屏显示、共享剪贴板、共享文件夹等功能。

在 Ubuntu 启动后，点击 VirtualBox 菜单栏 → 设备 → 安装增强功能，然后在 Ubuntu 终端里运行：

```bash
sudo apt install build-essential dkms linux-headers-$(uname -r)
# 然后运行光盘里的 VBoxLinuxAdditions.run
```

## Linux 基础命令

打开终端（Ctrl+Alt+T），开始练习这些命令：

### 文件与目录操作

```bash
ls              # 列出当前目录的文件
ls -la          # 列出详细信息（包括隐藏文件）
cd /home/user   # 进入目录
cd ..           # 返回上级目录
pwd             # 显示当前路径
mkdir test      # 创建目录
rm file.txt     # 删除文件
rm -rf dir/     # 删除目录（谨慎使用）
cp a.txt b.txt  # 复制文件
mv a.txt b.txt  # 移动/重命名文件
```

### 文件内容查看

```bash
cat file.txt        # 显示文件内容
less file.txt       # 分页查看（q 退出）
head -n 20 file.txt # 查看前 20 行
tail -n 20 file.txt # 查看后 20 行
grep "keyword" file # 在文件中搜索关键词
```

### 权限与用户

```bash
chmod +x script.sh  # 给文件添加执行权限
sudo command        # 以管理员权限执行命令
whoami              # 查看当前用户
```

### 网络

```bash
ping google.com     # 测试网络连通性
curl http://url     # 发送 HTTP 请求
wget http://url     # 下载文件
```

### 进程

```bash
ps aux              # 查看所有进程
kill -9 PID         # 强制终止进程
```

::: tip 练习资源
推荐阅读 [Linux 101](https://101.lug.ustc.edu.cn/Ch01/)，这是中科大 Linux 用户协会编写的入门教程，非常适合新手。
:::

## 换国内软件源（加速 apt 安装）

Ubuntu 默认使用境外服务器，下载速度很慢。换成国内镜像源：

```bash
sudo sed -i 's/archive.ubuntu.com/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list
sudo apt update
```

## 安装 CTF 常用工具

```bash
sudo apt update
sudo apt install -y \
    python3 python3-pip \
    git curl wget \
    gdb \
    binwalk \
    wireshark \
    file xxd strings
```
