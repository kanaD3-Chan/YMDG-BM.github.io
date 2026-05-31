---
title: CTF Pwn 环境配置记录
icon: mdi:wrench
category:
  - 文章
tag:
  - CTF
  - Pwn
  - 环境配置
---

在 Arch Linux 上配 pwn 环境，主要踩的坑是 cpwn 的 libc 下载全靠 launchpad，网络不稳定导致 pkgs 目录全是空壳，patch 了跟没 patch 一样。

<!-- more -->

## 问题根因

cpwn 的 `fetch` 命令先爬 launchpad.net 拿下载链接，再下载 deb 包。网络一抖，deb 没下完，但目录结构已经建好了——所以 `cpwn init` 找路径时目录存在，文件不存在，patch 静默失败。

验证方法：

```bash
find ~/.config/cpwn/pkgs/ -type f | head
# 如果没有输出，说明全是空目录
```

## 修复：用清华镜像下载

写了个脚本绕过 launchpad，直接从清华镜像拉 deb 并解压到 cpwn 期望的路径结构。

Arch Linux 没有 `dpkg-deb`，用 `ar` + `tar` 手动解压。

```bash
# ~/cpwn/fetch_mirror.sh
# 用法：
bash ~/cpwn/fetch_mirror.sh 2.35-0ubuntu3.13 amd64   # 指定版本
bash ~/cpwn/fetch_mirror.sh                           # 下载常用版本
```

脚本核心逻辑：

```bash
url="https://mirror.tuna.tsinghua.edu.cn/ubuntu/pool/main/g/glibc/${pkg}"
curl -fL -o "$deb_path" "$url"

# 解压 deb（Arch 无 dpkg-deb）
tmp_ar=$(mktemp -d)
ar x "$deb_path" --output="$tmp_ar"
tar -xf "$tmp_ar"/data.tar.* -C "$extract_path"
```

## 修复：cpwn 加 --version 参数

做题目录里没有 libc 文件时，cpwn 会进入交互式选版本流程，不方便脚本化。给 `cpwn init` 加了 `--version` 参数直接跳过：

```bash
cpwn init --version 2.35-0ubuntu3.13
```

## 日常用法

```bash
# 题目目录里有 libc.so.6，自动识别版本
cpwn init

# 没有 libc，手动指定
cpwn init --version 2.35-0ubuntu3.13

# 需要新版本时用镜像脚本下载
bash ~/cpwn/fetch_mirror.sh 2.27-3ubuntu1.5 amd64
```

已下载的版本：2.23 / 2.27 / 2.31 / 2.35 / 2.39（amd64）。

## 验证 patch 是否生效

```bash
ldd ./binary_patched
# 应该看到 ~/.config/cpwn/pkgs/... 路径的 libc.so.6
# 而不是系统的 /usr/lib/libc.so.6
```
