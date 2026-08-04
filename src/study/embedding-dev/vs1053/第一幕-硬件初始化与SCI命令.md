---
title: 第一幕：硬件初始化与SCI命令
order: 1
category:
  - 嵌入式开发
  - STM32
  - SPI
  - VS1053
---

VS1053 有两套接口共用同一组 SPI 引脚，靠两个片选区分：**XCS** 选通控制接口（SCI，读写寄存器），**XDCS** 选通数据接口（SDI，喂音频数据）。

## 引脚连接

VS1053 挂在 **SPI2** 上，DREQ 接外部中断：

| 信号 | GPIO | 说明 |
|---|---|---|
| SPI2_SCK | PB13 | SPI 时钟 |
| SPI2_MOSI | PB15 | 主机输出 → VS1053 |
| SPI2_MISO | PB14 | VS1053 输出 → 主机 |
| XCS | PA9 | 命令片选（SCI，低有效） |
| XDCS | PA10 | 数据片选（SDI，低有效） |
| DREQ | PA11 | 数据请求（EXTI11，高电平可收数据） |
| RST | PA12 | 硬件复位（低有效） |

TX 用 `DMA1_CH4`，RX 用 `DMA1_CH3`：

```rust
let vs_spi = spi::Spi::new(
    p.SPI2,
    p.PB13,      // SCK
    p.PB15,      // MOSI
    p.PB14,      // MISO
    p.DMA1_CH4,  // TX
    p.DMA1_CH3,  // RX
    Irqs,
    vs_spi_config(Hertz::hz(1_000_000)),
);
let dreq = ExtiInput::new(p.PA11, p.EXTI11, Pull::None, Irqs);
let xcs = Output::new(p.PA9, Level::High, Speed::VeryHigh);
let xdcs = Output::new(p.PA10, Level::High, Speed::VeryHigh);
let rst = Output::new(p.PA12, Level::Low, Speed::Low);
```

初始速度只有 1 MHz，因为复位后芯片内部时钟还没稳定。

## DREQ 与流控

VS1053 内部有 2048 字节的接收 FIFO。`DREQ` 为高表示可以继续收数据，为低表示 FIFO 快满了，必须等。DREQ 接成 `ExtiInput`，`wait_for_high()` 是异步等待，不会忙等，让出 CPU 给其他任务。

## SCI 寄存器写入

SCI 写命令是 4 字节帧：`[0x02] [地址] [数据高8位] [数据低8位]`：

```rust
pub async fn sci_write(&mut self, address: u8, data: u16) -> Result<(), spi::Error> {
    self.wait_freq().await;
    self.xcs.set_low();

    let tx_buf: [u8; 4] = [0x02, address, (data >> 8) as u8, (data & 0xFF) as u8];
    self.spi.write(&tx_buf).await?;

    self.xcs.set_high();
    self.wait_freq().await;
    Ok(())
}
```

## 初始化时序

```rust
pub async fn init(&mut self) -> Result<(), spi::Error> {
    self.rst.set_low();
    Timer::after_millis(10).await;
    self.rst.set_high();
    Timer::after_millis(10).await;
    self.wait_freq().await;

    // 低速写关键配置
    self.set_speed(Hertz(1_000_000))?;
    self.sci_write(0x00, 0x0800).await?;   // MODE: 软件复位
    self.sci_write(0x03, 0x8800).await?;   // CLOCKF: 8x 倍频
    Timer::after_millis(2).await;

    // PLL 锁定后切高速
    self.set_speed(Hertz(8_000_000))?;
    Ok(())
}
```

| 寄存器 | 地址 | 写入值 | 作用 |
|---|---|---|---|
| MODE | 0x00 | 0x0800 | 软件复位 |
| CLOCKF | 0x03 | 0x8800 | 内部时钟 8× 倍频 |
| VOL | 0x0B | 0x0000~0xFEFE | 音量，0 最大声 |

音量的映射是反的：`0x0000` 最大声，`0xFEFE` 几乎静音。设置百分比时做一个反转：

```rust
pub async fn set_volume(&mut self, percent: u8) -> Result<(), spi::Error> {
    let percent = percent.min(100);
    let val = (100 - percent as u16) * 254 / 100;
    let vol = (val << 8) | val;   // 左右声道相同
    self.sci_write(0x0B, vol).await
}
```

::: warning 为什么先低速后高速
VS1053 复位后 PLL 还没锁定，直接拿 8 MHz 通信可能失败。1 MHz 写完 MODE 和 CLOCKF，等 2 ms 让时钟稳定，再切 8 MHz。
:::
