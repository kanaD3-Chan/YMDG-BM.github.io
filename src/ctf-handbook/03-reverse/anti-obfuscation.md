---
title: 反混淆与脱壳
order: 6
icon: mdi:layers-remove
category:
  - CTF
  - 手册
  - Reverse
---

混淆和加壳是保护程序逻辑的常见手段，也是 CTF 逆向题的常见障碍。

## 加壳与脱壳

"壳"是一段包裹在原程序外面的代码，运行时先解密/解压原程序，再跳转执行。

### UPX 壳（最常见）

```bash
# 检测是否有 UPX 壳
upx -t binary
# 或者用 file 命令，会显示 "UPX compressed"

# 一键脱壳
upx -d binary -o binary_unpacked
```

脱壳后用 IDA 重新打开即可正常分析。

### 手动脱壳（ESP 定律）

对于不认识的壳，用 ESP 定律：

1. 程序入口处，壳代码先保存寄存器（`pushad`），此时 ESP 指向保存的寄存器
2. 在 ESP 指向的内存下**硬件断点**（访问断点）
3. 运行程序，壳解压完毕后会恢复寄存器（`popad`），触发断点
4. 此时 `jmp` 到的地址就是原程序入口（OEP）
5. 用 Scylla 插件 dump 内存并修复 IAT

## 花指令

花指令是插入在代码中的无用指令，目的是干扰反汇编器，让 IDA 无法正确识别函数边界。

### 识别花指令

常见模式：

```asm
; 永远不会跳转的条件跳转
jz  label
jnz label
; 中间插入垃圾字节
db 0xE8   ; 这个字节会让反汇编器误判
label:
; 真正的代码
```

### 去除花指令

**方法1：IDA 手动 patch**

1. 找到花指令区域
2. 选中垃圾字节，按 `D` 转为数据
3. 或者用 `Edit → Patch program → Change byte` 改为 `0x90`（NOP）
4. 按 `C` 重新反汇编，`P` 重新识别函数，`F5` 重新反编译

**方法2：IDAPython 批量 NOP**

```python
import idc, idaapi

def nop_range(start, end):
    for addr in range(start, end):
        idc.patch_byte(addr, 0x90)

# 把 0x401000 到 0x401010 全部 NOP 掉
nop_range(0x401000, 0x401010)
```

## OLLVM 控制流平坦化

OLLVM 把正常的控制流（if/else/loop）变成一个大 switch，所有分支都通过一个"调度器"跳转，让 IDA 的伪代码变得极难阅读。

**识别特征**：
- 函数里有一个巨大的 switch 语句
- 大量的 `state = 0xXXXXXXXX` 赋值
- 真正的逻辑被分散在各个 case 里

**去除工具**：

```bash
# deflat.py（基于 angr 的去平坦化工具）
pip install angr
python deflat.py -f binary --addr 0x401000
```

去除后重新用 IDA 打开，伪代码会清晰很多。

## 字符串加密

程序把字符串加密存储，运行时解密，防止直接搜索字符串找 Flag。

**应对方法**：

1. 动态调试：在字符串使用处下断点，运行时直接看解密后的值
2. 找解密函数：IDA 里找被频繁调用的函数，通常就是解密函数
3. 模拟执行：用 Python 复现解密算法

```python
# 常见的简单字符串加密：XOR
encrypted = [0x66, 0x6b, 0x60, 0x67, 0x7b, 0x5e, 0x5e, 0x5e]
key = 0x13
flag = ''.join(chr(b ^ key) for b in encrypted)
print(flag)
```

## 虚拟机保护（VM Protect）

高级保护：把原始指令翻译成自定义的虚拟机指令集，需要逆向虚拟机本身才能理解逻辑。

CTF 中遇到 VM 保护题：
1. 先识别虚拟机的指令集（handler 函数）
2. 写脚本把虚拟机字节码翻译回伪汇编
3. 分析翻译后的逻辑

这类题难度较高，入门阶段了解概念即可。

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

- [壳里面是什么](http://172.16.173.140/training/11?challenge=60) — 程序被 UPX 加壳，脱壳后分析真正的逻辑

## 练手资源

- 攻防世界 Reverse 中级题（有加壳和混淆题）
- CTFHub 逆向技能树
