---
title: 内存管理
icon: material-symbols:memory
order: 3
category:
  - Wiki
  - 操作系统
---

物理内存管理（PMM）负责追踪物理页的分配状态；虚拟内存管理（VMM）负责建立虚拟地址到物理地址的映射。

<!-- more -->

## 整体架构

```
  用户进程 A           用户进程 B
  [0x0...0x7FFF...]   [0x0...0x7FFF...]
       |                      |
       v                      v
  +----- PML4 (每进程一份) -----+
       |                      |
       v                      v
  [VMM 四级页表翻译——MMU 硬件自动完成]
       |
       v
  [PMM 位图分配器——管理物理页]
       |
       v
  ===================== 物理内存 =====================
```

## 物理内存管理（PMM）

### 核心思想

把物理内存按 4 KiB 页切分，用一个位图（bitmap）追踪每一页的分配状态：**1 = 已分配，0 = 空闲。**

### 位图公式

| 变量 | 公式 |
|---|---|
| 总页数 | `total_pages = (highest_addr + 4095) / 4096` |
| 位图字节数 | `bitmap_size = (total_pages + 7) / 8` |
| 页→位索引 | `page_idx = phys_addr / 4096` |
| 位→页地址 | `phys_addr = page_idx * 4096` |

### 位操作原语

```c
// 标记已分配
bitmap[page_idx / 8] |= (1 << (page_idx % 8));

// 标记空闲
bitmap[page_idx / 8] &= ~(1 << (page_idx % 8));

// 查询状态
bool used = (bitmap[page_idx / 8] >> (page_idx % 8)) & 1;
```

### 初始化流程

::: tabs#pmm-init

@tab 步骤

1. 遍历 Limine 内存地图，找最高物理地址
2. 计算位图大小，4 KiB 对齐
3. 从首个 `USABLE` 区域"切出"位图存储空间
4. 位图全部置 `0xFF`（全部标记为已分配）
5. 遍历所有 `USABLE` 区域，清除对应位
6. 保留低 1 MiB（前 256 页 = BIOS/VGA 区）

@tab 代码概览

```c
void pmm_init() {
  // 1. 找最高地址
  uint64_t highest_addr = 0;
  for (i = 0; i < memmap->entry_count; i++)
    highest_addr = max(highest_addr, entry->base + entry->length);

  // 2. 计算位图大小
  total_pages = (highest_addr + 4095) / 4096;
  bitmap_size = (total_pages + 7) / 8;

  // 3. 分配位图 + 4. 全部标记已用
  bitmap = PHYS_TO_VIRT(first_usable->base);
  memset(bitmap, 0xFF, bitmap_size);

  // 5. 清除可用区域
  for (i = 0; i < memmap->entry_count; i++)
    if (entry->type == LIMINE_MEMMAP_USABLE)
      bitmap_clear_range(entry->base, entry->length);

  // 6. 保留低 1 MiB
  for (j = 0; j < 256; j++) bitmap_set(j);
}
```

:::

### 分配优化技巧

```c
// 按字节快速跳过：一个字节全 0xFF = 连续 8 页已满
if (bitmap[check_idx / 8] == 0xFF) {
    i += (8 - (check_idx % 8));  // 跳过整字节
    continue;
}
```

### HHDM 地址转换

Limine 提供 HHDM（Higher Half Direct Map），让内核在高半区也能直接访问物理内存：

```c
#define PHYS_TO_VIRT(addr) ((void*)((uint64_t)(addr) + hhdm_offset))
#define VIRT_TO_PHYS(addr) ((uint64_t)(addr) - hhdm_offset)
```

## 虚拟内存管理（VMM）

### 四级页表

x86-64 使用 48 位虚拟地址，分为 5 段：

```
63-48     47-39   38-30   29-21   20-12   11-0
[符号扩展] [PML4]  [PDPT]  [PD]    [PT]    [页内偏移]
           9-bit   9-bit   9-bit   9-bit   12-bit
```

每级索引 9 位 → 512 个表项。翻译链路：

```
CR3 → PML4[vaddr[47:39]] → PDPT[vaddr[38:30]]
    → PD[vaddr[29:21]] → PT[vaddr[20:12]] → 物理页
```

### 页表项标志

| 位 | 宏 | 作用 |
|---|---|---|
| 0 | `PTE_PRESENT` | 页存在，缺失则触发 #PF |
| 1 | `PTE_WRITABLE` | 可写（W^X 策略的基础） |
| 2 | `PTE_USER` | Ring 3 可访问 |
| 63 | `PTE_NX` | 禁止执行（NX / XD） |
| 12-51 | `PTE_ADDR_MASK` | 物理地址掩码 |

### 页表遍历实现

```c
void vmm_map_page(uint64_t *pml4, uint64_t vaddr, uint64_t paddr, uint64_t flags) {
  // 提取各级索引
  uint64_t pml4_idx = (vaddr >> 39) & 0x1FF;
  uint64_t pdpt_idx = (vaddr >> 30) & 0x1FF;
  uint64_t pd_idx   = (vaddr >> 21) & 0x1FF;
  uint64_t pt_idx   = (vaddr >> 12) & 0x1FF;

  // PML4 → PDPT：不存在则分配新页
  if (!(pml4[pml4_idx] & PTE_PRESENT)) {
    uint64_t new_phys = pmm_alloc();
    memset(PHYS_TO_VIRT(new_phys), 0, 4096);
    pml4[pml4_idx] = new_phys | PTE_PRESENT | PTE_WRITABLE | PTE_USER;
  }

  // PDPT → PD → PT（同上模式，逐级按需分配）

  // PT → 物理页
  pt[pt_idx] = (paddr & PTE_ADDR_MASK) | flags;
  invlpg(vaddr);  // 刷新 TLB
}
```

::: warning TLB 刷新不能忘
修改页表后必须 `invlpg(vaddr)` 刷新 TLB 中该地址的缓存。不刷新会导致 CPU 继续用旧的（或已失效的）映射——出现随机性 bug。
:::

### 获取当前页表

```c
uint64_t *vmm_get_current_pml4() {
  uint64_t cr3;
  __asm__ volatile("mov %%cr3, %0" : "=r"(cr3));
  return (uint64_t *)(cr3 & PTE_ADDR_MASK);  // 低 12 位是标志
}
```

### VMM 验证测试

`kmain()` 中的端到端验证：

```c
uint64_t phys = pmm_alloc();                     // PMM 拿一页
vmm_map_page(pml4, 0x1000000000, phys,           // VMM 映射
             PTE_PRESENT | PTE_WRITABLE);
uint64_t *ptr = (uint64_t *)0x1000000000;
*ptr = 0xDEADBEEFCAFEBABE;                       // 写入
assert(*ptr == 0xDEADBEEFCAFEBABE);              // 读回验证
```

这验证了完整的链条：PMM→VMM→MMU→CPU。

## 交叉引用

- [启动流程与CPU初始化](./boot.md) — CR0/CR3/CR4 寄存器
- [中断与异常处理](./interrupts.md) — Page Fault 处理与 CR2 寄存器
