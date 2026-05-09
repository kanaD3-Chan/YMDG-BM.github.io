---
title: 帧缓冲控制台
icon: material-symbols:terminal
order: 4
category:
  - Wiki
  - 操作系统
---

基于 Limine 线性帧缓冲（Linear Framebuffer）和 PSF2 位图字体的裸机控制台实现。

<!-- more -->

## 帧缓冲参数

从 Limine 响应获取：

| 字段 | 含义 | 单位 |
|---|---|---|
| `address` | 显存起始地址（HHDM 转换后） | 虚拟地址 |
| `width` | 屏幕宽度 | 像素 |
| `height` | 屏幕高度 | 像素 |
| `pitch` | 每行字节跨度 | 字节 |

::: warning pitch ≠ width × 4
某些显卡会对每行做对齐填充，所以计算像素偏移公式是：
`fb_ptr[y * (pitch / 4) + x]`，而不是 `fb_ptr[y * width + x]`
:::

## 色彩格式

32 位色（`0x00RRGGBB`）：

```c
#define COLOR_WHITE  0x00FFFFFF  // 白色前景
#define COLOR_BLACK  0x00000000  // 黑色背景
```

## PSF2 字体

### 文件头结构

```c
typedef struct {
  uint32_t magic;          // 魔数: 0x864ab572
  uint32_t version;        // PSF 版本
  uint32_t headersize;     // 头大小（字节）
  uint32_t flags;
  uint32_t numglyph;       // 字形总数
  uint32_t bytesperglyph;  // 每字形字节数
  uint32_t height;         // 字形高度（像素）
  uint32_t width;          // 字形宽度（像素）
} psf2_header_t;
```

### 字形数据布局

```
[PSF2 Header] [Glyph 0] [Glyph 1] ... [Glyph N]
              ← headersize bytes →
              ← bytesperglyph bytes each →
```

每行占 `(width + 7) / 8` 字节（位打包）。行间按 MSB-first 排列：
- `0x80` → 最左像素亮
- `0x01` → 最右像素亮

## 核心 API

### 像素绘制

```c
static inline void put_pixel(uint32_t x, uint32_t y, uint32_t color) {
  if (x >= fb_width || y >= fb_height) return;  // 边界检查
  fb_ptr[y * (fb_pitch / 4) + x] = color;
}
```

### 字符绘制流程

@startuml
start
:fb_putchar;
if (是换行 \\n?) then (yes)
  :光标移到下一行开始;
else (no)
  :定位字形数据: header + c × bytesperglyph;
  :逐行扫描字形的每个像素;
  if (位为 1?) then (yes)
    :put_pixel 白色;
  else (no)
    :put_pixel 黑色;
  endif
  :光标右移一个字符宽;
  if (超出右边界?) then (yes)
    :自动换行;
    if (超出底边界?) then (yes)
      :回到顶部: 环形覆盖;
    endif
  endif
endif
stop
@enduml

### 输出函数

```c
void fb_putchar(char c);           // 单个字符（含换行/换页逻辑）
void fb_print_str(const char *s);  // 字符串（不自动加换行）
int  fb_puts(const char *s);       // 字符串 + 自动加 '\n'
void fb_print_hex(uint64_t val);   // 十六进制（0x 前缀，16 位大写）
```

### 十六进制输出

```c
void fb_print_hex(uint64_t val) {
  const char *hex = "0123456789ABCDEF";
  fb_print_str("0x");
  for (int i = 15; i >= 0; i--)
    fb_putchar(hex[(val >> (i * 4)) & 0xF]);
}
```

## 显示效果

```
PMM Initialized.
VMM Initialized
Hello World!
VMM Mapping Test Passed!
```

::: tip 未来扩展方向
- 彩色输出（每个字符独立前景色/背景色）
- 真正的滚屏（移动已有像素内容而非环形覆盖）
- 多个虚拟控制台（Alt+F1~F6 切换）
- 光标闪烁
:::

## 交叉引用

- [启动流程与CPU初始化](./boot.md) — FPU/SSE 在 fb_init 之前初始化
- [内存管理](./memory.md) — 控制台输出调试 PMM/VMM 状态
