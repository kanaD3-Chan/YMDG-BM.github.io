---
title: 逆向工程参考
icon: proicons:reverse
order: 2
category:
  - Wiki
  - CTF
---

逆向工程的核心是"还原程序逻辑"。本页覆盖基本工作流、常见加密算法特征和工具用法。

<!-- more -->

## 基本工作流

> IDA `F5` 看伪代码 → 找关键比较/check 函数 → 逆向算法 → 写脚本解密

### IDA 常用快捷键

| 快捷键 | 功能 |
|---|---|
| `F5` | 反编译为伪 C 代码 |
| `Shift+F12` | 打开字符串窗口 |
| `X` | 查看交叉引用（谁调用了这里） |
| `N` | 重命名变量/函数 |
| `G` | 跳转到地址 |
| `Alt+T` | 搜索文本 |
| `Space` | 切换图表/文本视图 |

## 常见题型

### 1. 字符串明文

`Shift+F12` 搜索 `flag`、`ctf`、`{`、`}`、`success`。最简单的题直接把 Flag 硬编码在程序里。

### 2. 硬编码比较

```c
// IDA 伪代码中常见的模式
if (input[0] == 'f' && input[1] == 'l' &&
    input[2] == 'a' && input[3] == 'g')
```

或者：
```c
if (!strcmp(input, "s3cr3t_k3y"))
```

### 3. 加密算法识别

| 算法 | 特征常数 | 特征操作 |
|---|---|---|
| **XOR** | 无固定常数 | 大量 `^=` 操作 |
| **Base64** | 字符表 `A-Za-z0-9+/` | 查表替换，移位拼接 |
| **TEA** | `delta = 0x9E3779B9` | 32 轮 Feistel 结构，循环移位 |
| **XTEA** | 同上 | 不同轮函数，同样 delta |
| **RC4** | 256 字节 S-box | 交换 S[i] 和 S[j]，异或 |
| **AES** | S-box 256 字节查找 | SubBytes, ShiftRows, MixColumns |
| **MD5/SHA** | IV 常数（如 `0x67452301`） | 多轮非线性变换 |

## 动态调试

### Linux（GDB）

```bash
gdb ./binary
b *0x401234        # 地址下断
b check_password   # 函数名下断
r                  # 运行
ni                 # 单步（不进入函数）
si                 # 单步（进入函数）
c                  # 继续
x/s $rax           # 查看 rax 指向的字符串
p $rdi             # 打印 rdi 的值
```

### Windows（x64dbg）

- `F2` 下断点
- `F8` 单步步过
- `F7` 单步步入
- `F9` 运行
- 右侧面板实时显示寄存器值和内存

## 反混淆技巧

| 技术 | 应对方法 |
|---|---|
| OLLVM 混淆 | 用 `deflat.py` 去除控制流平坦化（部分情况） |
| UPX 壳 | `upx -d binary` |
| 花指令（Junk Code） | IDA patch 掉无用指令后重新 `F5` |
| 反调试 | patch 掉 `ptrace`/`IsDebuggerPresent` 调用 |

## Python 解密模板

```python
# XOR 解密
cipher = bytes.fromhex("deadbeef...")
key = 0x37
flag = ''.join(chr(b ^ key) for b in cipher)
print(flag)

# TEA 解密（需自行实现或找到轮函数）
# delta = 0x9E3779B9, rounds = 32

# Base64 变种（自定义字符表）
import base64
custom = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
std    = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
trans = str.maketrans(custom, std)
print(base64.b64decode(cipher.translate(trans)))
```

## 工具速查

| 工具 | 平台 | 用途 |
|---|---|---|
| IDA Pro | Win/Linux/Mac | 静态反汇编/反编译（首选） |
| Ghidra | 全平台 | NSA 开源替代（免费） |
| x64dbg | Windows | 动态调试 |
| GDB + pwndbg | Linux | 动态调试 |
| Frida | 全平台 | 动态插桩（也能做逆向） |
| JADX / JEB | 全平台 | Android APK 逆向 |

## 交叉引用

- [二进制安全速查](./pwn.md) — Pwn 与 Reverse 的工具重叠
- [密码学攻击参考](./crypto.md) — 识别加密算法后的下一步
