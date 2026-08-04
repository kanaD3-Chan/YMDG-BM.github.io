---
title: 第一幕：SDMMC 初始化
order: 1
category:
  - 嵌入式开发
  - STM32
  - SDIO
---

STM32F407 的 SDIO 外设在 Embassy 里叫 `sdmmc`。项目用 4 线模式，配合 DMA 做高速块传输。

## 引脚连接

| SDIO 信号 | GPIO 引脚 | 说明 |
|---|---|---|
| SDIO_CK | PC12 | 时钟线 |
| SDIO_CMD | PD2 | 命令/响应线 |
| SDIO_D0 | PC8 | 数据线 0 |
| SDIO_D1 | PC9 | 数据线 1 |
| SDIO_D2 | PC10 | 数据线 2 |
| SDIO_D3 | PC11 | 数据线 3 |

4 线模式同时使用 D0-D3，带宽是 1 线模式的 4 倍，持续读 WAV 文件不会卡顿。

## 时钟配置

项目时钟树从 HSI 出发，经过 PLL 得到 168 MHz 系统时钟和 48 MHz 外设时钟：

```rust
let mut rcc = RccConfig::default();
rcc.hsi = true;
rcc.pll_src = PllSource::HSI;
rcc.pll = Some(Pll {
    prediv: PllPreDiv::DIV16,    // HSI 16 MHz / 16 = 1 MHz
    mul: PllMul::MUL336,         // 1 MHz × 336 = 336 MHz
    divp: Some(PllPDiv::DIV2),   // 336 / 2 = 168 MHz (SYSCLK)
    divq: Some(PllQDiv::DIV7),   // 336 / 7 = 48 MHz (SDIO/USB)
    divr: None,
});
rcc.sys = Sysclk::PLL1_P;
rcc.ahb_pre = AHBPrescaler::DIV1;
rcc.apb1_pre = APBPrescaler::DIV4;
rcc.apb2_pre = APBPrescaler::DIV2;
```

SD 卡协议要求数据传输阶段最高 25 MHz，所以 SDMMC 时钟取 24 MHz，由 48 MHz 经内部分频得到。

## 创建 SDMMC 控制器

```rust
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
```

`SDIO` 中断处理命令/响应，`DMA2_CH6` 负责数据块搬运完成后的通知，两者都要在 `bind_interrupts!` 里注册。

## 识别 SD 卡

`StorageDevice::new_sd_card` 会执行完整初始化序列（CMD0 → CMD8 → ACMD41 → CMD2 → CMD3）。卡没插好或者刚上电时会失败，所以项目里用循环重试，失败时屏幕提示插卡：

```rust
let mut cmd_block = CmdBlock::new();

let storage = loop {
    match StorageDevice::new_sd_card(&mut sdmmc, &mut cmd_block, mhz(24)).await {
        Ok(storage) => break storage,
        Err(_) => {
            warn!("sd card init failed");
            if let Some(screen) = screen.as_mut() {
                screen.show_error("SD CARD", "Insert FAT card");
            }
            Timer::after_millis(1000).await;
        }
    }
};
```

识别成功后，`storage` 就是一个可随机读写的块设备。下一步是给它套上文件系统。
