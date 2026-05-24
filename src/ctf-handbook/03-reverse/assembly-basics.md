---
title: 汇编语言基础
order: 1
icon: mdi:chip
category:
  - CTF
  - 手册
  - Reverse
---

逆向工程的核心是读懂汇编代码。你不需要精通汇编，但要能看懂 IDA 反汇编出来的代码。

## x86-64 寄存器

```
通用寄存器（64位/32位/16位/8位）：
rax / eax / ax / al    — 函数返回值
rbx / ebx / bx / bl    — 被调用者保存
rcx / ecx / cx / cl    — 第 4 个参数
rdx / edx / dx / dl    — 第 3 个参数
rsi / esi / si / sil   — 第 2 个参数
rdi / edi / di / dil   — 第 1 个参数
rsp / esp              — 栈顶指针
rbp / ebp              — 栈帧基址
r8  ~ r15              — 第 5~6 个参数及通用

特殊寄存器：
rip    — 指令指针（当前执行位置）
rflags — 标志寄存器（ZF/CF/SF/OF 等）
```

**System V AMD64 调用约定**（Linux）：
- 前 6 个整数参数：rdi, rsi, rdx, rcx, r8, r9
- 返回值：rax
- 超出 6 个的参数：压栈传递

## 常用指令

### 数据传送

```asm
mov rax, rbx        ; rax = rbx
mov rax, [rbx]      ; rax = *rbx（从内存读）
mov [rax], rbx      ; *rax = rbx（写入内存）
mov rax, 0x10       ; rax = 16（立即数）
lea rax, [rbx+8]    ; rax = rbx + 8（取地址，不读内存）
push rax            ; rsp -= 8; *rsp = rax
pop rax             ; rax = *rsp; rsp += 8
```

### 算术运算

```asm
add rax, rbx        ; rax += rbx
sub rax, rbx        ; rax -= rbx
imul rax, rbx       ; rax *= rbx（有符号乘）
idiv rbx            ; rax = rdx:rax / rbx（商在rax，余数在rdx）
inc rax             ; rax++
dec rax             ; rax--
neg rax             ; rax = -rax
```

### 位运算

```asm
and rax, rbx        ; rax &= rbx
or  rax, rbx        ; rax |= rbx
xor rax, rbx        ; rax ^= rbx
not rax             ; rax = ~rax
shl rax, 3          ; rax <<= 3（左移）
shr rax, 3          ; rax >>= 3（逻辑右移）
sar rax, 3          ; rax >>= 3（算术右移，保留符号位）
```

### 比较与跳转

```asm
cmp rax, rbx        ; 计算 rax - rbx，设置标志位，不保存结果
test rax, rax       ; 计算 rax & rax，常用于判断是否为 0

; 条件跳转（根据标志位）
je  label           ; 相等时跳转（ZF=1）
jne label           ; 不等时跳转（ZF=0）
jg  label           ; 大于时跳转（有符号）
jl  label           ; 小于时跳转（有符号）
ja  label           ; 大于时跳转（无符号）
jb  label           ; 小于时跳转（无符号）
jz  label           ; 为零时跳转（同 je）
jnz label           ; 非零时跳转（同 jne）
jmp label           ; 无条件跳转
```

### 函数调用

```asm
call func           ; push rip; jmp func（调用函数）
ret                 ; pop rip（返回）
```

## 常见代码模式识别

### if-else

```asm
; if (rax == 0) { ... } else { ... }
cmp rax, 0
jne else_branch
; if 分支代码
jmp end
else_branch:
; else 分支代码
end:
```

### for 循环

```asm
; for (int i = 0; i < 10; i++)
mov ecx, 0          ; i = 0
loop_start:
cmp ecx, 10
jge loop_end        ; if i >= 10, break
; 循环体
inc ecx             ; i++
jmp loop_start
loop_end:
```

### 数组访问

```asm
; arr[i]（int 数组，每个元素 4 字节）
; rdi = arr 基址，rsi = i
mov eax, [rdi + rsi*4]
```

## 快速阅读技巧

1. **先看函数调用**：`call` 指令调用了什么函数？`strcmp`、`malloc`、`printf` 这些名字直接告诉你在做什么
2. **找关键比较**：`cmp` + 条件跳转 = if 语句，找到比较的值就找到了关键逻辑
3. **看 rdi/rsi**：函数调用前的 `mov rdi, ...` 就是第一个参数
4. **不要逐行读**：先看整体结构（循环/分支），再看关键部分

::: note 课后练习
课后练习需要你连接校园网才能访问内网练习平台。
:::

## 课后练习

- [汇编读不懂？先从这里开始](http://172.16.173.140/training/11?challenge=55) — 一道简单的汇编题目，读懂代码就能拿到 flag

## 练手资源

- [godbolt.org](https://godbolt.org/) — 在线把 C 代码编译成汇编，对照学习
- 自己写 C 代码，用 `gcc -S` 生成汇编文件
