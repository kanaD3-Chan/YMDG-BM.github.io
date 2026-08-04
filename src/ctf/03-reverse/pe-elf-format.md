---
title: PE 与 ELF 文件格式
order: 2
icon: mdi:file-cog-outline
category:
  - CTF
  - 手册
  - Reverse
---

了解可执行文件的格式，有助于理解程序的加载过程，也是脱壳、修复导入表等操作的基础。

## ELF 格式（Linux）

ELF（Executable and Linkable Format）是 Linux 下可执行文件、共享库、目标文件的格式。

### 文件结构

```
+------------------+
| ELF Header       |  文件类型、架构、入口点地址
+------------------+
| Program Headers  |  描述如何加载到内存（段）
+------------------+
| .text            |  代码段（可执行）
| .rodata          |  只读数据（字符串常量）
| .data            |  已初始化的全局变量
| .bss             |  未初始化的全局变量
| .plt             |  过程链接表（外部函数跳转）
| .got             |  全局偏移表（存放外部函数地址）
+------------------+
| Section Headers  |  描述各节的名称、大小、偏移
+------------------+
```

### 常用命令

```bash
file binary             # 查看文件类型和架构
readelf -h binary       # 查看 ELF 头
readelf -S binary       # 查看所有节（section）
readelf -d binary       # 查看动态链接信息
objdump -d binary       # 反汇编代码段
nm binary               # 查看符号表
strings binary          # 提取字符串
ldd binary              # 查看依赖的共享库
```

### PLT 和 GOT

动态链接的核心机制：

```
程序调用 puts()
  → 跳转到 puts@plt
  → puts@plt 查 GOT 表
  → 第一次调用：GOT 里是 resolver，触发动态链接，把真实地址写入 GOT
  → 之后调用：GOT 里直接是 puts 的真实地址
```

**Pwn 中的意义**：GOT 表存放了 libc 函数的真实地址，泄露 GOT 表中的值就能计算 libc 基址。

## PE 格式（Windows）

PE（Portable Executable）是 Windows 下 `.exe`、`.dll` 的格式。

### 文件结构

```
+------------------+
| DOS Header       |  MZ 魔术数字，兼容 DOS
| DOS Stub         |  "This program cannot be run in DOS mode"
+------------------+
| PE Header        |  PE 签名（50 45 00 00）
| COFF Header      |  机器类型、节数量、时间戳
| Optional Header  |  入口点、镜像基址、节对齐
+------------------+
| Section Table    |  各节的名称、大小、偏移、属性
+------------------+
| .text            |  代码
| .rdata           |  只读数据（字符串、导入表）
| .data            |  已初始化数据
| .rsrc            |  资源（图标、版本信息）
+------------------+
```

### 导入表（IAT）

PE 文件通过导入表记录需要从哪些 DLL 导入哪些函数：

```
kernel32.dll
  ├── CreateFileA
  ├── ReadFile
  └── CloseHandle
user32.dll
  ├── MessageBoxA
  └── CreateWindowExA
```

**脱壳后修复 IAT**：壳运行时会重建 IAT，脱壳后 IAT 可能损坏，需要用 Scylla 等工具修复。

### 常用工具

```
PE-bear      — PE 文件结构查看器（免费）
CFF Explorer — PE 编辑器
PEiD         — 检测壳和编译器
Detect-It-Easy (DIE) — 现代版 PEiD，支持更多格式
```

```bash
# Linux 下分析 PE 文件
python3 -c "
import pefile
pe = pefile.PE('binary.exe')
print(pe.dump_info())
"
```

## 文件头魔术数字

| 格式 | 魔术数字 | 说明 |
|------|---------|------|
| ELF | `7F 45 4C 46` | `.ELF` |
| PE | `4D 5A` | `MZ`（DOS Header） |
| Mach-O | `CE FA ED FE`（64 位为 `CF FA ED FE`） | macOS 可执行文件 |
| Java Class | `CA FE BA BE` | Java 字节码 |
| DEX | `64 65 78 0A` | Android Dalvik 字节码 |

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

- [文件头里的秘密](http://172.16.173.140/training/11?challenge=56) — flag 藏在文件的某个段里，使用 `readelf` 或 010 Editor 分析

## 练手资源

- 用 `readelf` 分析自己编译的程序
- PE-bear 打开一个 Windows 程序，对照文档理解各字段
