---
title: 逆向入门——从C代码到汇编，再回到C代码
order: 1
category:
  - CTF
  - Reverse
icon: proicons:reverse
---

逆向就是把编译好的程序（exe、elf）翻回人能看懂的逻辑。你拿到的是一坨二进制，目标是从中找出算法、拿到 Flag。

<!-- more -->

## 你需要知道的最少前置知识

- **C 语言基本语法**：函数、循环、指针。不需要精通，能看懂就行。
- **一点汇编**：`mov`、`add`、`cmp`、`jmp`、`call`、`ret` 这六个指令能覆盖 80% 的场景。
- **编译是什么**：C 代码 → 编译器 → 二进制文件。逆向就是反过来。

## 工具：RapidMermaid

- **IDA Pro**：把二进制变成汇编代码和伪 C 代码。逆向的核心工具。没有它，你就是在看天书。
- **x64dbg**（Windows）/ **GDB**（Linux）：动态调试。可以在程序运行时下断点、看寄存器、改内存。

用 IDA 打开一个程序，按 `F5` 就能看到伪 C 代码——虽然不太好看，但比汇编强多了。

## 第一步：自己动手编译→反编译

这是理解逆向的最快方法。

**1. 写一段 C 代码**：

```c
#include <stdio.h>

int check_password(char *input) {
    if (input[0] == 'f' && input[1] == 'l' &&
        input[2] == 'a' && input[3] == 'g') {
        return 1;
    }
    return 0;
}

int main() {
    char buf[32];
    scanf("%31s", buf);
    if (check_password(buf)) {
        printf("Correct!\n");
    } else {
        printf("Wrong!\n");
    }
    return 0;
}
```

**2. 编译**：

```bash
gcc -o test test.c
```

**3. 用 IDA 打开**，按 `F5` 看 `check_password` 的伪代码：

```c
_BOOL1 __fastcall check_password(char *input) {
  return input[0] == 'f' && input[1] == 'l'
      && input[2] == 'a' && input[3] == 'g';
}
```

——你会发现 IDA 几乎完美还原了源码。这就是最简单的逆向：**编译完的东西并没有丢失信息，只是换了一种表达方式。**

把这个实验多做几遍，分别试试 `for` 循环、`if-else`、结构体、数组，看看编译器把它们变成了什么样子。

## CTF 逆向最常见的东西

### 1. 字符串搜 Flag

IDA 打开程序，`Shift+F12` 打开字符串窗口。很多简单的题直接把 Flag 明文写在程序里。搜索 `flag`、`ctf`、`{`、`}`。

### 2. 硬编码比较

```c
if (input[0] == 's' && input[1] == 'e' && input[2] == 'c' ...)
```

或者更常见的——把字符串和输入做比较：

```c
if (strcmp(input, "secret_password") == 0)
```

字符串窗口找不到就直接看伪代码里的比较逻辑（`F5` 后找 `strcmp` 或逐字符比较的代码段）。

### 3. 简单的加密算法

考题经常用一个可逆的算法对 Flag 加密，然后让你解密。常见的有：

- **异或（XOR）**：`c ^ 0x37` ← 加密和解密是同一个操作
- **Base64 变种**：字符表被换过了，用标准的 Base64 解码不行
- **TEA/XTEA**：轻量级分组密码，代码短但足够复杂

识别方法：在 IDA 里找特征常数。比如 TEA 的 `delta = 0x9E3779B9`，XOR 操作的特征是大量的 `^=`。

## 基本工作流

```
用 IDA 打开 → Shift+F12 搜字符串 → F5 看伪代码
  → 找到关键比较/判断逻辑 → 逆向出算法 → 写脚本解密
```

如果伪代码太难看（比如有混淆），开调试器（x64dbg/GDB），在关键函数下断点，单步跟踪看寄存器里的值。

## 一条建议

不要一上来就打开 Ghidra 或 IDA 看别人的大程序。先从自己写的 50 行 C 代码开始，编译→反编译→对比。反复几次之后，你会发现汇编没那么可怕。**读懂机器的语言，是与机器对话的第一步。**

## 练手资源

- [攻防世界](https://adworld.xctf.org.cn/) 的 Reverse 新手区
- CTFHub 的逆向技能树
- 自己写 C 程序→用 IDA 分析（这是最好的入门方式）
