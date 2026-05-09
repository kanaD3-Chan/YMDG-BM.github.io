---
title: 第一幕：硬件初始化与SCI命令
order: 1
category:
  - 嵌入式开发
  - STM32
  - SPI
  - VS1053
---

VS1053 有两套 SPI 接口共用一组引脚，通过两个片选信号区分：XCS 用于命令（SCI），XDCS 用于数据（SDI）。

<!-- more -->

## VS1053 是什么

VS1053 是 VLSI 出品的音频编解码芯片，能硬件解码 MP3、WAV、AAC、FLAC 等格式。我们只需通过 SPI 把音频数据"喂"给它，它就会自动输出模拟音频信号，不需要 CPU 参与解码运算。

## 引脚连接

| 信号 | GPIO | 说明 |
|---|---|---|
| SPI1_SCK | PA5 | SPI 时钟 |
| SPI1_MOSI | PA7 | 主机输出 → VS1053 输入 |
| SPI1_MISO | PA6 | VS1053 输出 → 主机输入 |
| XCS | PA4 | 命令片选（SCI，低有效） |
| XDCS | PC4 | 数据片选（SDI，低有效） |
| RST | PB0 | 硬件复位 |
| DREQ | PC5 | 数据请求（VS1053 FIFO 状态指示） |

`DREQ` 是关键信号——VS1053 内部有一个 2048 字节的 FIFO。`DREQ` 为高时可以继续发送数据，为低时必须等待。

## SPI 初始化

```rust
use embassy_stm32::spi::{self, Spi};
use embassy_stm32::exti::ExtiInput;
use embassy_stm32::gpio::{Output, Level, Speed};

let spi1 = spi::Spi::new(
    p.SPI1,
    p.PA5,        // SCK
    p.PA7,        // MOSI
    p.PA6,        // MISO
    p.DMA2_CH3,   // TX DMA
    p.DMA2_CH0,   // RX DMA
    Irqs,
    spi::Config::default(),
);

let xcs = Output::new(p.PA4, Level::High, Speed::Low);
let xdcs = Output::new(p.PC4, Level::High, Speed::Low);
let rst = Output::new(p.PB0, Level::Low, Speed::Low);
let dreq = ExtiInput::new(p.PC5, p.EXTI5, Pull::None, Irqs);
```

::: tip 片选初始电平
XCS 和 XDCS 都是低电平有效。初始化时全部拉高，确保 VS1053 不会误读总线上的杂乱数据。
:::

## SCI 寄存器写入

通过 SCI 接口写寄存器，格式为 4 字节命令帧：`[0x02] [address] [data_high] [data_low]`。

```rust
pub async fn sci_write(&mut self, address: u8, data: u16) -> Result<(), spi::Error> {
    self.dreq.wait_for_high().await;   // 等芯片就绪
    self.xcs.set_low();                // 选中 SCI

    let tx_buf: [u8; 4] = [0x02, address, (data >> 8) as u8, (data & 0xFF) as u8];
    self.spi.write(&tx_buf).await?;

    self.xcs.set_high();               // 释放 SCI
    self.dreq.wait_for_high().await;   // 等芯片处理完成
    Ok(())
}
```

`dreq.wait_for_high()` 是 Embassy 的异步等待——不会忙等，而是让出 CPU 给其他任务。

## 初始化时序

VS1053 上电后需要特定时序才能进入工作状态：

```rust
pub async fn init(&mut self) -> Result<(), spi::Error> {
    // 硬件复位
    self.rst.set_low();
    Timer::after_millis(10).await;
    self.rst.set_high();
    Timer::after_millis(10).await;
    self.dreq.wait_for_high().await;

    // 低速模式（1 MHz）写关键配置
    self.set_speed(Hertz(1_000_000))?;
    self.sci_write(0x00, 0x0800).await?;   // MODE: 软件复位
    self.sci_write(0x03, 0x8800).await?;   // CLOCKF: 8× 倍频
    Timer::after_millis(2).await;

    // 切高速（8 MHz）
    self.set_speed(Hertz(8_000_000))?;
    Ok(())
}
```

| 寄存器 | 地址 | 写入值 | 作用 |
|---|---|---|---|
| MODE | 0x00 | 0x0800 | 软件复位 |
| CLOCKF | 0x03 | 0x8800 | 时钟 8× 倍频 |
| VOL | 0x0B | 可变 | 左右声道音量 |

::: warning 为什么先低速后高速？
VS1053 复位后内部时钟尚未稳定，直接用 8 MHz 通信可能失败。1 MHz 写关键配置，等 PLL 锁定后再切高速。
:::
