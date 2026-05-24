---
title: Windows 逆向基础
order: 9
icon: mdi:microsoft-windows
category:
  - CTF
  - 手册
  - 逆向工程
---

Windows 平台的 CTF 逆向题以 PE 可执行文件（.exe/.dll）为主，工具链与 Linux 有所不同。

## 工具准备

| 工具 | 用途 |
|------|------|
| x64dbg | 动态调试（开源，推荐） |
| IDA Pro / Ghidra | 静态反汇编/反编译 |
| PE-bear / CFF Explorer | PE 文件结构查看 |
| Detect-It-Easy (DIE) | 查壳、识别编译器 |
| Process Monitor | 监控文件/注册表/网络操作 |
| API Monitor | 监控 Windows API 调用 |

## 快速上手：x64dbg

### 基本操作

```
F2        下断点（在当前行）
F7        单步步入（进入函数）
F8        单步步过（不进入函数）
F9        运行到下一个断点
Ctrl+G    跳转到地址
Ctrl+F    搜索字符串/字节序列
右键 → Follow in Dump  在内存窗口查看数据
```

### 常用断点

```
bp MessageBoxA    在 MessageBox 弹窗时断下
bp strcmp         在字符串比较时断下
bp CreateFileA    在打开文件时断下

# 硬件断点（不修改代码，绕过反调试）
右键内存地址 → Breakpoint → Hardware, Access
```

### 找关键比较

```
1. 运行程序，输入错误的 flag
2. 在 strcmp/memcmp 下断点
3. 断下后查看参数：
   - RCX（第1参数）= 输入的字符串
   - RDX（第2参数）= 正确的字符串
4. 直接读出正确答案
```

## 反调试技术与绕过

Windows 程序常用以下反调试手段：

### IsDebuggerPresent

```c
// 程序代码
if (IsDebuggerPresent()) {
    ExitProcess(0);  // 检测到调试器就退出
}
```

**绕过**：在 x64dbg 中，Options → Preferences → Engine → 勾选 "Skip IsDebuggerPresent"

或手动 patch：找到 `call IsDebuggerPresent` 后的 `test eax, eax; jnz exit`，把 `jnz` 改成 `jz`（或直接 NOP 掉跳转）。

### CheckRemoteDebuggerPresent

```c
BOOL isDebug = FALSE;
CheckRemoteDebuggerPresent(GetCurrentProcess(), &isDebug);
if (isDebug) ExitProcess(0);
```

**绕过**：在调用后，在内存中把 `isDebug` 变量改为 0。

### 时间检测

```c
DWORD t1 = GetTickCount();
// ... 一些操作 ...
DWORD t2 = GetTickCount();
if (t2 - t1 > 1000) ExitProcess(0);  // 调试时操作太慢
```

**绕过**：在 x64dbg 中 Hook `GetTickCount`，让它始终返回固定值。或者直接 patch 跳转。

### ScyllaHide 插件

x64dbg 的 ScyllaHide 插件可以自动绕过大多数反调试：

```
x64dbg → Plugins → ScyllaHide → 勾选所有选项
```

## 注册表与文件操作分析

用 Process Monitor 监控程序行为：

```
1. 打开 Process Monitor（procmon.exe）
2. 设置过滤器：Process Name = 目标程序名
3. 运行目标程序
4. 观察：
   - RegQueryValue：读取注册表（可能读取序列号）
   - CreateFile：打开文件（可能读取 key 文件）
   - WriteFile：写入文件（可能写入 flag）
```

## 常见题型

### 题型1：序列号验证

```
特征：输入序列号，程序验证对错
方法：
1. 在 strcmp/memcmp 下断点
2. 或追踪验证算法，逆向计算正确序列号
3. 注意：有些程序用自定义比较，不调用标准库函数
```

### 题型2：加密 flag

```python
# 常见模式：flag 经过变换后与硬编码数组比较
# 逆向变换函数，写解密脚本

encrypted = [0x41, 0x42, 0x43, ...]  # 从程序中提取
key = 0x13

flag = ''.join(chr(c ^ key) for c in encrypted)
print(flag)
```

### 题型3：迷宫题

```
特征：输入一串方向字符（WASD/UDLR），程序判断是否走出迷宫
方法：
1. 找到迷宫数据（通常是二维数组）
2. 找到起点和终点
3. 用 BFS/DFS 求解路径
```

```python
from collections import deque

maze = [
    "##########",
    "#S.......#",
    "#.######.#",
    "#........#",
    "#.######.#",
    "#.......E#",
    "##########",
]

def solve_maze(maze):
    rows, cols = len(maze), len(maze[0])
    start = end = None
    for r in range(rows):
        for c in range(cols):
            if maze[r][c] == 'S': start = (r, c)
            if maze[r][c] == 'E': end = (r, c)

    queue = deque([(start, "")])
    visited = {start}
    dirs = [(-1,0,'U'), (1,0,'D'), (0,-1,'L'), (0,1,'R')]

    while queue:
        (r, c), path = queue.popleft()
        if (r, c) == end:
            return path
        for dr, dc, d in dirs:
            nr, nc = r+dr, c+dc
            if 0 <= nr < rows and 0 <= nc < cols and \
               maze[nr][nc] != '#' and (nr,nc) not in visited:
                visited.add((nr, nc))
                queue.append(((nr, nc), path + d))

print(solve_maze(maze))
```

### 题型4：虚拟机（VM）保护

```
特征：程序有一个解释器循环，执行自定义字节码
方法：
1. 找到 dispatch 循环（通常是大 switch-case）
2. 分析每个 opcode 的语义
3. 提取字节码，手动或编写反汇编器分析逻辑
```

## .NET 程序逆向

很多 Windows CTF 题用 C# 编写：

```bash
# 识别：DIE 显示 .NET / MSIL
# 工具：dnSpy（最佳）或 ILSpy

# dnSpy 使用
1. 打开 .exe 文件
2. 左侧树形结构浏览命名空间和类
3. 双击方法查看反编译的 C# 代码
4. 可以直接在 dnSpy 中设置断点调试
```

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

- [Windows 下的逆向](http://172.16.173.140/training/11?challenge=63) — 一个 Windows exe 程序，用 x64dbg 动态调试拿到 flag

## 练手资源

- [Crackmes.one](https://crackmes.one/) — 大量 Windows 逆向练习题
- CTFHub 逆向 Windows 系列
- 攻防世界 Windows 题目
- [Malware Traffic Analysis](https://www.malware-traffic-analysis.net/) — 恶意软件分析练习
