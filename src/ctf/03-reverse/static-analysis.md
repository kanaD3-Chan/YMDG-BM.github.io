---
title: 静态分析入门
order: 3
icon: proicons:reverse
category:
  - CTF
  - 手册
  - Reverse
---

静态分析就是在**不运行程序**的情况下，通过阅读汇编代码或反编译出的伪 C 代码来理解程序逻辑。

## 工具准备

```bash
# Ghidra（免费，从官网下载）
# https://ghidra-sre.org/
# 需要较新的 JDK（官方要求通常是 17+）：sudo apt install openjdk-17-jdk

# 或者 IDA Free（免费版，功能有限制）
# https://hex-rays.com/ida-free/
```

推荐入门先用 **IDA Pro**，熟悉后再学 Ghidra。

## 第一步：自己编译→反编译

这是理解逆向最快的方法——先看自己写的代码被编译成什么样子。

**1. 写一段 C 代码**：

```c
// test.c
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

**3. 用 IDA 打开**，按 `F5` 看 `check_password` 的伪代码——你会发现 IDA 几乎完美还原了源码。

**反复做这个实验**，分别试试 `for` 循环、`if-else`、数组，看看编译器把它们变成了什么样子。

## IDA 常用操作

| 快捷键 | 功能 |
|--------|------|
| F5 | 反编译为伪 C 代码 |
| Shift+F12 | 打开字符串窗口 |
| X | 查看交叉引用（谁调用了这个函数） |
| N | 重命名变量/函数 |
| G | 跳转到地址 |
| Space | 切换图表/文本视图 |

::: tip 重命名是关键
IDA 反编译出来的变量名都是 `v1`、`v2` 这种。分析时随手按 `N` 重命名成有意义的名字，思路会清晰很多。
:::

## 常见题型解法

### 1. 字符串搜 Flag（最简单）

`Shift+F12` 打开字符串窗口，搜索 `flag`、`ctf`、`{`、`}`。很多简单题直接把 Flag 明文写在程序里。

### 2. 硬编码比较

伪代码里看到这种逐字符比较：

```c
if (input[0] == 's' && input[1] == 'e' && input[2] == 'c' ...)
// 或者
if (strcmp(input, "secret_password") == 0)
```

直接从伪代码里读出正确答案。

### 3. 简单加密算法

程序对 Flag 做了某种变换后存储，你需要逆向这个变换。

**常见算法识别**：

| 算法 | 特征 |
|------|------|
| XOR | 大量 `^=` 操作 |
| Base64 变种 | 字符表 A-Za-z0-9+/，查表替换 |
| TEA | 特征常数 `0x9E3779B9`，32 轮循环 |
| RC4 | 256 字节 S-box，交换 S[i]/S[j] |

**XOR 解密脚本**：

```python
cipher = bytes.fromhex("deadbeef...")
key = 0x37
flag = ''.join(chr(b ^ key) for b in cipher)
print(flag)
```

## 反混淆技巧

| 技术 | 应对方法 |
|------|----------|
| UPX 壳 | `upx -d binary` 脱壳 |
| OLLVM 混淆 | 用 `deflat.py` 去除控制流平坦化 |
| 花指令 | IDA patch 无用指令后重新 F5 |
| 反调试 | patch 掉 `ptrace`/`IsDebuggerPresent` 调用 |

## 基本工作流

```
用 IDA 打开
  → Shift+F12 搜字符串
  → F5 看伪代码
  → 找到关键比较/判断逻辑
  → 逆向出算法
  → 写 Python 脚本解密
```

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

- [IDA 第一课](http://172.16.173.140/training/11?challenge=57) — 用 IDA 分析程序逻辑，反编译找出 flag

## 练手资源

- 攻防世界 Reverse 新手区（从 easyre 开始）
- CTFHub 逆向技能树
- **自己写 C 程序 → 用 IDA 分析**（最好的入门方式）
