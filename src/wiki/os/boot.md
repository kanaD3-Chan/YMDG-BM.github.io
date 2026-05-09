---
title: 启动流程与CPU初始化
icon: material-symbols:power-settings-new
order: 1
category:
  - Wiki
  - 操作系统
---

本页覆盖 x86-64 架构下从按下电源键到内核 `kmain()` 执行的完整链路。

<!-- more -->

## 启动全貌

```mermaid
flowchart LR
    A[按下电源] --> B[BIOS/UEFI]
    B --> C[POST 自检]
    C --> D[读取 MBR]
    D --> E[Limine Stage 1]
    E --> F[Limine Stage 2]
    F --> G[Limine Stage 3]
    G --> H[加载内核 ELF]
    H --> I[填充请求响应]
    I --> J[跳转 kmain]
    J --> K[内核初始化]
```

## BIOS 阶段

| 步骤 | 说明 |
|---|---|
| **POST** | 上电自检，检测 CPU、内存、外设是否正常 |
| **MBR 加载** | BIOS 读取第一个扇区（512字节），跳转到 `0x7C00` 执行 |
| **Stage 1→2** | 链式加载，Stage 1 找 Stage 2，Stage 2 解压并加载 Stage 3 |

::: tip 关键地址
- MBR 加载位置：`0x00007C00`
- 内核高半区入口：`0xFFFFFFFF80000000`
- 初始内核栈：64 KiB（Limine 提供）
:::

## Limine 协议

Limine 是一个现代的 x86-64 引导协议，在接管 CPU 后完成：

1. **进入 64 位长模式**，启用分页
2. **清零通用寄存器**，关闭中断（`cli`）
3. **准备 64 KiB 内核栈**
4. **扫描内核二进制中的请求结构体**，填充响应（framebuffer、内存地图、HHDM 偏移）
5. **跳转到内核入口点**（`kmain`）

### 三种请求类型

| 请求 | 用途 | 关键字段 |
|---|---|---|
| **Framebuffer** | 屏幕显示 | `address`, `width`, `height`, `pitch` |
| **Memory Map** | 物理内存布局 | `entries[]`, `base`, `length`, `type` |
| **HHDM** | 物理地址→虚拟地址 | `offset` |

## CPU 初始化（`init()` 顺序）

`kmain()` 调用 `init()`，按以下顺序初始化：

```c
void init() {
  enable_fpu_and_sse();  // 1. 开启浮点运算
  gdt_init();            // 2. 加载 GDT
  idt_init();            // 3. 加载 IDT + 开中断
  fb_init();             // 4. 初始化帧缓冲
  pmm_init();            // 5. 物理内存管理器
  vmm_init();            // 6. 虚拟内存管理器
}
```

### 1. FPU/SSE 启用

| 操作 | 寄存器 | 位 | 含义 |
|---|---|---|---|
| 清 EM | CR0 | bit 2 | 禁用 x87 仿真 |
| 清 TS | CR0 | bit 3 | 清除任务切换标志 |
| 设 MP | CR0 | bit 1 | 监控协处理器 |
| 设 NE | CR0 | bit 5 | 原生异常处理 |
| 设 OSFXSR | CR4 | bit 9 | 启用 SSE |
| 设 OSXMMEXCPT | CR4 | bit 10 | 启用 SSE 异常 |
| `finit` | — | — | 初始化 x87 FPU |

### 2. GDT（全局描述符表）

x86-64 下 GDT 几乎不再承担实际的内存分段功能，但出于兼容性仍需初始化。

```
+-----+--------+------+---------+-------------+
|  #  | 类型   | Base | Limit   | Access/Gran |
+-----+--------+------+---------+-------------+
|  0  | Null   |  0   |  0      | 0x00 / 0x00 |
|  1  | 64-bit |  0   | 4 GiB   | 0x9A / 0xAF  |  ← CS = 0x08
|  2  | 64-bit |  0   | 4 GiB   | 0x92 / 0x00  |  ← DS/SS = 0x10
+-----+--------+------+---------+-------------+
```

关键指令：
```asm
lgdt [rdi]      ; 加载 GDT 基址和限长
retfq           ; 远返回刷新 CS 为 0x08
```

### 3. IDT（中断描述符表）

详见 [中断与异常处理](./interrupts.md)。

### 4-6

详见 [帧缓冲控制台](./console.md) 和 [内存管理](./memory.md)。

## 编译参数速查

```makefile
# 必要的编译标志
CFLAGS = -ffreestanding -nostdlib -mno-red-zone \
         -mno-mmx -mno-sse -mno-sse2 -mgeneral-regs-only

# 链接脚本
LDFLAGS = -T linker-scripts/x86_64.lds -nostdlib
```

| 标志 | 作用 |
|---|---|
| `-ffreestanding` | 不依赖宿主操作系统的标准库 |
| `-nostdlib` | 不链接标准 C 库 |
| `-mno-red-zone` | 禁用 AMD64 红区（内核必须） |
| `-mgeneral-regs-only` | 只使用通用寄存器，不碰浮点/SIMD |

## 交叉引用

- [中断与异常处理](./interrupts.md) — CPU 异常类型与 ISR 注册
- [内存管理](./memory.md) — PMM 位图分配器与 VMM 四级页表
- [帧缓冲控制台](./console.md) — PSF2 字体与像素渲染
