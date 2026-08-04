---
title: 动态调试
order: 4
icon: mdi:bug-play-outline
category:
  - CTF
  - 手册
  - Reverse
---

静态分析看不出来的东西（加密密钥、运行时计算结果），动态调试可以直接在程序运行时观察。

## GDB 基础（Linux）

```bash
gdb ./binary
```

### 常用命令

```bash
# 断点
b main              # 在 main 函数下断点
b *0x401234         # 在地址下断点
b check_password    # 在函数名下断点
info b              # 查看所有断点
d 1                 # 删除断点 1

# 运行控制
r                   # 运行程序
r arg1 arg2         # 带参数运行
ni                  # 单步（不进入函数）
si                  # 单步（进入函数）
c                   # 继续执行到下一个断点
finish              # 执行完当前函数

# 查看数据
x/20gx $rsp         # 查看栈上 20 个 8 字节值（十六进制）
x/s $rax            # 查看 rax 指向的字符串
x/10i $rip          # 查看当前位置的 10 条指令
p $rdi              # 打印寄存器值
p/x $rax            # 以十六进制打印
info registers      # 查看所有寄存器

# 修改数据（绕过检查）
set $rax = 1        # 修改寄存器
set *(int*)0x601060 = 0  # 修改内存
```

### Pwndbg 增强命令

安装 Pwndbg 后额外获得：

```bash
context         # 自动显示寄存器+栈+代码（每步自动执行）
stack 20        # 查看栈上 20 个值
telescope $rsp  # 智能解析栈上的指针链
search -s "flag"  # 在内存中搜索字符串
vmmap           # 查看内存映射
```

## x64dbg（Windows）

Windows 程序用 x64dbg 调试，界面直观，适合入门。

**基本操作**：

| 操作 | 快捷键 |
|------|--------|
| 运行 | F9 |
| 单步（不进入） | F8 |
| 单步（进入） | F7 |
| 运行到返回 | Ctrl+F9 |
| 下断点 | F2 |
| 搜索字符串 | Ctrl+F |

**常用技巧**：
- 右键 → 在内存窗口中转到 → 查看内存
- 右键寄存器 → 修改值 → 绕过检查
- 插件 Scylla：脱壳后修复 IAT

## 动态调试实战：破解密码检查

```c
// 目标程序
int check(char *input) {
    char key[] = {0x41, 0x42, 0x43, 0x44};  // 运行时才知道
    for (int i = 0; i < 4; i++) {
        if (input[i] != key[i]) return 0;
    }
    return 1;
}
```

**调试步骤**：

1. IDA 找到 `check` 函数地址，比如 `0x401156`
2. GDB 在该地址下断点：`b *0x401156`
3. 运行程序，输入任意字符串
4. 断点触发后，查看 `key` 数组的内存：`x/4bx 地址`
5. 读出正确密码

## 常见反调试手段

程序检测到调试器时会退出或走错误分支：

| 手段 | 原理 | 绕过方法 |
|------|------|---------|
| `ptrace(PTRACE_TRACEME)` | 只能被 trace 一次 | patch 掉这个调用 |
| `IsDebuggerPresent()` | Windows API | 修改返回值为 0 |
| 时间检测 | 调试时执行慢 | 修改时间比较的跳转 |
| 父进程检测 | 检查父进程是否是调试器 | patch 掉检测逻辑 |

**GDB 绕过 ptrace**：

```bash
# 方法1：patch 掉 ptrace 调用
# 在 IDA 里找到 ptrace 调用，把它 NOP 掉（改成 90 90 90...）

# 方法2：用 LD_PRELOAD 劫持 ptrace
cat > fake_ptrace.c << 'EOF'
#include <sys/ptrace.h>
long ptrace(int req, ...) { return 0; }
EOF
gcc -shared -fPIC -o fake_ptrace.so fake_ptrace.c
LD_PRELOAD=./fake_ptrace.so gdb ./binary
```

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

- [断点打在哪里](http://172.16.173.140/training/11?challenge=58) — 程序做了反静态分析，用 GDB 动态调试看穿它的逻辑

## 练手资源

- 攻防世界 Reverse 新手区（有需要动态调试的题）
- CTFHub 逆向技能树
