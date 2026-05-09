---
title: 第二幕：IDT——为中断搭建舞台
icon: fluent-mdl2:processing-run
order: 2
category:
  - 操作系统
tag:
  - IDT
  - 中断
  - 裸机编程
---

## 绪

上一幕我们搭建了 GDT，让 CPU 知道了代码段和数据段的边界。但 CPU 还需要知道一件事：当异常发生、当外设请求关注时，该跳转到哪里去处理？

这就是 IDT（Interrupt Descriptor Table，中断描述符表）的使命。如果说 GDT 是定义了"规则"，那 IDT 就是定义了"应急预案"——每一条表项都是一条逃生路线，指向一个中断处理函数。

在 x86-64 体系下，前 32 个中断向量被 CPU 保留用于异常处理。从除零错误到缺页异常，每一种都是 CPU 在向我们诉苦："出事了，你看看怎么办吧。"

<!-- more -->

## IDT 的结构

IDT 的每一项都是一个 16 字节的门描述符。在 64 位模式下，我们使用中断门（Interrupt Gate），它的结构如下：

| 字段 | 位宽 | 含义 |
|---|---|---|
| `isr_low` | 16 | ISR 地址的低 16 位 |
| `kernel_cs` | 16 | 内核代码段选择子（GDT 中为 0x08） |
| `ist` | 8 | 中断栈表索引（我们填 0） |
| `attributes` | 8 | 门类型与特权级（0x8E = 存在、Ring 0、64 位中断门） |
| `isr_middle` | 16 | ISR 地址的中间 16 位 |
| `isr_high` | 32 | ISR 地址的高 32 位 |
| `reserved` | 32 | 保留，填 0 |

注意到一个有趣的设计：ISR 地址被拆分成了三段。这是历史遗留问题——为了兼容 32 位时代的描述符格式。在 64 位长模式下，地址确实可以跨越 64 位，但描述符中只记录了 48 位的偏移量。不过对内核来说，48 位地址空间已经绰绰有余了。

我们在 `idt.h` 中定义这个结构体：

```C
struct idt_entry {
  uint16_t isr_low;
  uint16_t kernel_cs;
  uint8_t ist;
  uint8_t attributes;
  uint16_t isr_middle;
  uint32_t isr_high;
  uint32_t reserved;
} __attribute__((packed));

struct idt_ptr {
  uint16_t limit;
  uint64_t base;
} __attribute__((packed));
```

`__attribute__((packed))` 至关重要——它告诉编译器不要对结构体进行对齐填充。因为 CPU 期望的是字节级精确的原始布局，多一个字节的 padding 就会导致整个描述符偏移错位，进而引发难以调试的崩溃。

`idt_ptr` 则是用来传给 `lidt` 指令的结构。它的 `limit` 是表的总字节数减一，`base` 是表的起始地址。

## 初始化 IDT

初始化过程分为三步：先清空整张表，再批量注册前 32 个异常向量，最后用 `lidt` 加载并 `sti` 开中断。

```C
void idt_set_descriptor(uint8_t vector, void *isr, uint8_t flags) {
  uint64_t addr = (uint64_t)isr;
  idt[vector].isr_low = addr & 0xFFFF;
  idt[vector].kernel_cs = 0x08;
  idt[vector].ist = 0;
  idt[vector].attributes = flags;
  idt[vector].isr_middle = (addr >> 16) & 0xFFFF;
  idt[vector].isr_high = (addr >> 32) & 0xFFFFFFFF;
  idt[vector].reserved = 0;
}
```

`idt_set_descriptor` 把一个 ISR 函数指针拆解填入描述符的对应字段。`kernel_cs = 0x08` 对应我们 GDT 中的 64 位内核代码段。`flags` 我们传入 `0x8E`：

- bit 7 (P=1)：该描述符有效
- bits 5-6 (DPL=00)：Ring 0 特权级
- bits 0-4 (Type=0xE)：64 位中断门

当我们调用 `lidt` 加载 IDTR 寄存器后，CPU 就知道该去哪里找异常处理函数了。之后 `sti` 指令设置 RFLAGS 中的 IF 位，CPU 开始响应可屏蔽中断。

```C
void idt_init() {
  idtr.base = (uint64_t)&idt[0];
  idtr.limit = (uint16_t)sizeof(struct idt_entry) * 256 - 1;

  for (uint64_t i = 0; i < 256; ++i) {
    idt_set_descriptor(i, 0, 0);
  }

  void *isrs[32] = {isr_0, isr_1, isr_2, isr_3, isr_4, isr_5, isr_6,
                    isr_7, isr_8, isr_9, isr_10, isr_11, isr_12, isr_13,
                    isr_14, isr_15, isr_16, isr_17, isr_18, isr_19, isr_20,
                    isr_21, isr_22, isr_23, isr_24, isr_25, isr_26, isr_27,
                    isr_28, isr_29, isr_30, isr_31};

  for (int i = 0; i < 32; i++) {
    idt_set_descriptor(i, isrs[i], 0x8E);
  }

  __asm__ volatile("lidt %0" ::"m"(idtr));
  __asm__ volatile("sti");
}
```

这里有一个细节：我们先声明了 32 个外部函数 `isr_0` 到 `isr_31`。这些函数并非在本文件中实现——它们来自下一幕我们将要编写的中断处理模块。IDT 只负责"登记"，真正的处理逻辑在别处。

## 为什么先清空再填充？

你可能会问：既然我们只注册了前 32 个，为什么要把 256 个全部清空？

因为中断向量 32-255 目前尚未分配，但我们不能留下未初始化的内存。如果某天一个意外的中断信号触发了未初始化的表项，CPU 会跳转到随机地址——那将是一场灾难。将所有未使用的表项置零，至少能保证它们是不可用的（P 位为 0），触发时会生成一个异常而不是跳转到垃圾地址。

## 小结

至此，IDT 已经搭建完毕。CPU 在遇到异常时会自动查表、保存上下文、跳转到对应的 ISR。但那些 ISR 函数（`isr_0` ~ `isr_31`）还是空的声明——它们只是纸上谈兵。下一幕，我们将真正实现这些中断处理函数，让 CPU 在崩溃时至少能告诉我们："出事了，这是案发现场。"
