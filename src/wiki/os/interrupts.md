---
title: 中断与异常处理
icon: material-symbols:warning-outline
order: 2
category:
  - Wiki
  - 操作系统
---

x86-64 定义 256 个中断向量，前 32 个（0-31）由 CPU 保留用于异常。

<!-- more -->

## IDT 描述符结构

每项 16 字节，格式如下：

```
| 63-48 | 47-40 | 39-32 | 31-16    | 15-0     | Bits
|--------|--------|--------|----------|----------|
| isr_high (32 bit)   | attr   | ist     | isr_mid  | isr_low  | Fields
| 保留   | ISR[63:32]       | Flags  | IST | ISR[31:16]| ISR[15:0]|
```

::: details IDT entry 结构体定义

```c
struct idt_entry {
  uint16_t isr_low;      // ISR 地址低 16 位
  uint16_t kernel_cs;    // 代码段选择子 = 0x08
  uint8_t  ist;          // 中断栈表编号（0=不使用）
  uint8_t  attributes;   // 门类型 + 特权级
  uint16_t isr_middle;   // ISR 地址中 16 位
  uint32_t isr_high;     // ISR 地址高 32 位
  uint32_t reserved;     // 必须为 0
} __attribute__((packed));
```
:::

### Attributes 字段解码

```
Bit: 7  6  5  4  3  2  1  0
     P  DPL  DPL  0  GateType
```

| 值 | 含义 |
|---|---|
| `0x8E` | P=1（存在），DPL=00（Ring 0），Type=0xE（64位中断门） |
| `0xEE` | P=1，DPL=11（Ring 3 可经由 `int` 触发），Type=0xE |

## CPU 异常（0-31）

::: tabs#exceptions

@tab 无错误码

| 向量 | 名称 | 说明 |
|---|---|---|
| #0 | Division Error | 除零（`div` 指令） |
| #1 | Debug | 调试异常 |
| #2 | NMI | 不可屏蔽中断 |
| #3 | Breakpoint | `int3` 断点 |
| #4 | Overflow | `into` 指令 |
| #5 | Bound Range | `bound` 指令越界 |
| #6 | Invalid Opcode | 无效指令 |
| #7 | Device Not Available | x87/SSE 未启用 |
| #9 | Coprocessor Segment Overrun | 历史遗留 |
| #15 | (Reserved) | — |
| #16 | x87 FP Exception | 浮点异常 |
| #18 | Machine Check | 硬件错误 |
| #19 | SIMD FP Exception | SSE 浮点异常 |
| #20 | Virtualization Exception | VT-x 退出 |
| #22-27 | (Reserved) | — |
| #28 | Hypervisor Injection | Hyper-V |
| #31 | (Reserved) | — |

@tab 有错误码

| 向量 | 名称 | 说明 |
|---|---|---|
| #8 | Double Fault | 异常处理中再次异常 |
| #10 | Invalid TSS | TSS 加载失败 |
| #11 | Segment Not Present | 段不存在 |
| #12 | Stack-Segment Fault | 栈操作越界 |
| #13 | General Protection Fault | 通用保护 |
| **#14** | **Page Fault** | 缺页（CR2=故障地址） |
| #17 | Alignment Check | 未对齐访问 |
| #21 | Control Protection | CET 保护 |
| #29 | VMM Communication | VMM 通信 |
| #30 | Security Exception | 安全异常 |

:::

::: warning Page Fault（#14）最重要
缺页时 **CR2 保存了触发异常的虚拟地址**，是 VMM 调试的关键线索。异常错误码的低 4 位描述了缺页原因：
- Bit 0 (P)：0=页不存在，1=保护违规
- Bit 1 (W/R)：0=读，1=写
- Bit 2 (U/S)：0=内核态，1=用户态
:::

## ISR 宏生成

使用 `__attribute__((interrupt))` 配合宏批量生成 32 个处理函数：

```c
// 无错误码的异常
#define ISR_NO_ERR(vector, name)                   \
  __attribute__((interrupt)) void isr_##vector(    \
      struct interrupt_frame *frame) {              \
    panic_handler(frame, vector, 0, name);          \
  }

// 有错误码的异常
#define ISR_ERR(vector, name)                      \
  __attribute__((interrupt)) void isr_##vector(    \
      struct interrupt_frame *frame,                \
      uint64_t error_code) {                        \
    panic_handler(frame, vector, error_code, name); \
  }
```

## Panic 输出格式

```
==================================================
KERNEL PANIC: General Protection Fault
==================================================
Vector:    0xD
Error Code:0x0

RIP:       0xFFFFFFFF80001234
CS:        0x08
RFLAGS:    0x202
RSP:       0xFFFFFFFF80010000
SS:        0x10

CR2 (Fault Address): 0x0     ← 仅 Page Fault

System Halted.
```

## 关键汇编指令

| 指令 | 作用 |
|---|---|
| `lidt [mem]` | 加载 IDTR（IDT 基址 + 限长） |
| `sti` | 开中断（设 RFLAGS.IF） |
| `cli` | 关中断（清 RFLAGS.IF） |
| `iretq` | 从中断返回（64位模式） |
| `invlpg [addr]` | 刷新 TLB 中指定地址的条目 |

## 交叉引用

- [启动流程与CPU初始化](./boot.md) — GDT 初始化
- [内存管理](./memory.md) — Page Fault 与 VMM 的关系
