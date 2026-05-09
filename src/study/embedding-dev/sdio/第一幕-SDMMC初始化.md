---
title: 第一幕：SDMMC 初始化
order: 1
category:
  - 嵌入式开发
  - STM32
  - SDIO
---

STM32F407 的 SDIO 外设支持 SD 卡协议，在 Embassy 中叫 `sdmmc`。我们使用 4 线模式，配合 DMA 进行高速传输。

<!-- more -->

## 引脚连接

| SDIO 信号 | GPIO 引脚 | 说明 |
|---|---|---|
| SDIO_CK | PC12 | 时钟线 |
| SDIO_CMD | PD2 | 命令/响应线 |
| SDIO_D0 | PC8 | 数据线 0 |
| SDIO_D1 | PC9 | 数据线 1 |
| SDIO_D2 | PC10 | 数据线 2 |
| SDIO_D3 | PC11 | 数据线 3 |

4 线模式下 D0-D3 全部使用，相比 1 线模式带宽翻 4 倍。

## 中断绑定

Embassy 需要将外设中断绑定到对应的 handler。SDIO 和它使用的 DMA 通道都需要注册：

```rust
use embassy_stm32::{bind_interrupts, dma, sdmmc, peripherals};

bind_interrupts!(
    struct Irqs {
        SDIO => sdmmc::InterruptHandler<peripherals::SDIO>;
        DMA2_STREAM6 => dma::InterruptHandler<peripherals::DMA2_CH6>;
    }
);
```

`SDIO` 中断处理 SD 卡命令/响应，`DMA2_CH6` 负责数据传输完成后的通知。

## 时钟配置

SD 卡需要稳定且可调节的时钟。初始化阶段用低速，识别完成后切换到 24 MHz：

```rust
use embassy_stm32::rcc::*;

let mut rcc_config = Config::default();
rcc_config.hsi = true;
rcc_config.pll_src = PllSource::HSI;
rcc_config.pll = Some(Pll {
    prediv: PllPreDiv::DIV16,    // HSI 16 MHz / 16 = 1 MHz
    mul: PllMul::MUL336,         // 1 MHz × 336 = 336 MHz
    divp: Some(PllPDiv::DIV2),   // 336 / 2 = 168 MHz (SYSCLK)
    divq: Some(PllQDiv::DIV7),   // 336 / 7 = 48 MHz (SDIO)
    divr: None,
});
rcc_config.sys = Sysclk::PLL1_P;
rcc_config.ahb_pre = AHBPrescaler::DIV1;
rcc_config.apb1_pre = APBPrescaler::DIV4;
rcc_config.apb2_pre = APBPrescaler::DIV2;
```

::: tip 为什么 PLLQ 输出 48 MHz？
SD 卡协议规范要求数据传输阶段最高 25 MHz（默认速度模式）。48 MHz 经过 SDMMC 内部分频器可按需降低，且同时满足 USB OTG 的 48 MHz 要求。
:::

## 初始化 SDMMC 外设

```rust
use embassy_stm32::sdmmc::{self, Sdmmc};
use embassy_stm32::sdmmc::sd::{CmdBlock, StorageDevice};
use embassy_stm32::time::mhz;

let mut sdmmc = Sdmmc::new_4bit(
    p.SDIO,
    p.DMA2_CH6,
    Irqs,
    p.PC12,  // CK
    p.PD2,   // CMD
    p.PC8,   // D0
    p.PC9,   // D1
    p.PC10,  // D2
    p.PC11,  // D3
    Default::default(),
);

let mut cmd_block = CmdBlock::new();

// 循环等待 SD 卡就绪
let storage = loop {
    if let Ok(storage) = StorageDevice::new_sd_card(
        &mut sdmmc, &mut cmd_block, mhz(24)
    ).await {
        break storage;
    }
};
```

`new_4bit` 初始化 4 线模式的 SDMMC。`StorageDevice::new_sd_card` 执行完整的 SD 卡初始化序列（CMD0 → CMD8 → ACMD41 → CMD2 → CMD3），返回可读写的存储设备。如果卡还没上电或接触不良，这里会一直循环重试。
