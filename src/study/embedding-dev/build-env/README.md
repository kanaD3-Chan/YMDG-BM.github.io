---
title: 第一章——环境配置
index: true
icon: mdi:chip
order: 1
dir:
  link: true
  order: 1
category:
  - 嵌入式开发
  - 环境配置
---
工欲善其事，必先利其器。Rust 的嵌入式环境配置比传统 C 工程省心得多：不用折腾 Makefile、链接脚本和头文件路径，cargo 一把梭。

这一章把工具链、烧录器和工程骨架搭好，最后用一个闪灯程序验证整条链路。

::: important
本部分基于 Arch Linux 编写，命令以 pacman 为例；stlink 等驱动不在讨论范围内。其他系统请根据自己环境酌情适配。
:::

## 安装工具链

```bash
sudo pacman -S rustup
rustup install stable
rustup target add thumbv7em-none-eabihf
```

`thumbv7em-none-eabihf` 是 Cortex-M4F 的裸机目标。加了这个 target，编译器才能生成不带操作系统的代码。

烧录用 `probe-rs`，它同时负责下载固件和开调试通道：

```bash
cargo install probe-rs-tools
```

::: note
老教程会写 `cargo install probe-rs`，那是旧包名。现在的 crate 叫 `probe-rs-tools`，装完提供 `probe-rs` 命令。
:::

## 新建工程

```bash
cargo new stm32-ipod-rs
cd stm32-ipod-rs
```

创建一个 `.cargo/config.toml`，告诉 cargo 目标平台和烧录方式：

```toml
[build]
target = "thumbv7em-none-eabihf"

[target.thumbv7em-none-eabihf]
rustflags = ["-C", "link-arg=-Tlink.x", "-C", "link-arg=-Tdefmt.x"]
runner = "probe-rs run --chip STM32F407ZGTx"
```

`link.x` 是 cortex-m-rt 的链接脚本，`defmt.x` 是 defmt 日志宏需要的链接段。`memory.x` 不用自己写——embassy-stm32 开了 `memory-x` feature，链接时自动提供。

## 依赖清单

这是课设工程实际使用的依赖（来自仓库 `Cargo.toml`）：

```toml
[dependencies]
cortex-m = { version = "0.7.7", features = ["critical-section-single-core"] }
cortex-m-rt = "0.7.5"
defmt = "1.0.1"
defmt-rtt = "1.1.0"
embassy-executor = { version = "0.10.0", features = [
  "defmt",
  "executor-interrupt",
  "executor-thread",
  "platform-cortex-m",
] }
embassy-futures = "0.1.2"
embassy-stm32 = { version = "0.6.0", features = [
  "defmt",
  "exti",
  "memory-x",
  "stm32f407zg",
  "time-driver-tim4",
] }
embassy-time = { version = "0.5.1", features = [
  "defmt-timestamp-uptime",
  "tick-hz-8_000_000",
] }
embassy-sync = "0.8.0"
display-interface-spi = "0.5.0"
embedded-graphics = "0.8.2"
embedded-hal = "1.0.0"
embedded-hal-async = "1.0.0"
embedded-io = "0.7.1"
embedded-io-async = "0.7.0"
embedded-sdmmc = { path = "vendor/embedded-sdmmc" }
heapless = "0.9.2"
libm = "0.2"
mipidsi = "0.10.0"
panic-probe = { version = "1.0.0", features = ["print-defmt"] }
static_cell = "2.1.1"

[profile.release]
opt-level = 3
lto = "fat"
panic = "abort"
```

几个容易困惑的点：

- `stm32f407zg` feature 选芯片型号；`time-driver-tim4` 指定 TIM4 当 Embassy 的时间基准。
- `embedded-sdmmc` 走本地路径，因为项目针对 FAT32 大卡改过源码（见 SDIO 章节）。
- `mipidsi` + `embedded-graphics` 是屏幕那一路用的，`libm` 给电机控制提供 `sinf`。
- `panic = "abort"` + `panic-probe`：panic 时打印错误信息并停机，不 unwinding。

## 闪灯验证

先别急着上大项目，写一个闪灯程序验证“编译 → 烧录 → 跑起来”整条链路。STM32F407ZG-P1 核心板的板载 LED 通常接 PC13，低电平点亮（以自己板子的原理图为准）：

```rust
#![no_std]
#![no_main]

use embassy_executor::Spawner;
use embassy_stm32::{Output, Level, Speed};
use embassy_time::Timer;

use {defmt_rtt as _, panic_probe as _};

#[embassy_executor::main]
async fn main(_spawner: Spawner) {
    let p = embassy_stm32::init(Default::default());
    let mut led = Output::new(p.PC13, Level::High, Speed::Low);

    loop {
        led.set_low();
        Timer::after_millis(500).await;
        led.set_high();
        Timer::after_millis(500).await;
    }
}
```

然后：

```bash
cargo run --release
```

cargo 会编译，并自动通过 probe-rs 烧录进 STM32。LED 以 1 Hz 闪烁，说明环境通了。

::: important
PC13 只是大多数 F407 核心板的习惯接法。如果灯不亮，先查自己板子的原理图，别默认。
:::

<Catalog />
