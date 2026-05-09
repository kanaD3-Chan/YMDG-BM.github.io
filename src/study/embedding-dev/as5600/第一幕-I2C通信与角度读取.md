---
title: 第一幕：I2C通信与角度读取
order: 1
category:
  - 嵌入式开发
  - STM32
  - I2C
  - AS5600
---

AS5600 是 AMS 出品的 12 位磁性旋转位置传感器，通过 I2C 接口输出 0-4095 的角度值，分辨率 0.0879°。

<!-- more -->

## AS5600 原理

芯片内部有一组霍尔传感器阵列。径向磁铁旋转时，霍尔传感器检测到的磁场方向变化，经过内部 DSP 计算输出绝对角度。I2C 地址固定为 `0x36`（7 位）。

## 关键寄存器

| 寄存器 | 地址 | 位宽 | 说明 |
|---|---|---|---|
| RAW_ANGLE | 0x0C | 16 bit | 原始角度（0-4095），大端序 |
| ANGLE | 0x0E | 16 bit | 缩放后角度 |
| STATUS | 0x0B | 8 bit | bit 5 = 磁铁检测 |
| MAGNITUDE | 0x1B | 16 bit | 磁场强度 |

## 驱动结构

泛型设计，换 MCU 只需提供实现了 `I2c` trait 的总线实例：

```rust
use embedded_hal_async::i2c::I2c;

pub struct As5600<I2C> {
    i2c: I2C,
}
```

## 寄存器读取

`write_read` 一键完成"写寄存器地址 + 读数据"：

```rust
async fn read_u8(&mut self, reg: u8) -> Result<u8, As5600Error<E>> {
    let mut buf = [0u8; 1];
    self.i2c
        .write_read(AS5600_ADDR, &[reg], &mut buf)
        .await
        .map_err(As5600Error::I2c)?;
    Ok(buf[0])
}

async fn read_u16(&mut self, reg: u8) -> Result<u16, As5600Error<E>> {
    let mut buf = [0u8; 2];
    self.i2c
        .write_read(AS5600_ADDR, &[reg], &mut buf)
        .await
        .map_err(As5600Error::I2c)?;
    Ok(u16::from_be_bytes(buf))  // AS5600 使用大端序
}
```

::: warning 注意字节序
AS5600 的 16 位寄存器是大端序。Rust 的 `from_be_bytes` 直接处理转换，省掉手动移位。
:::

## 磁铁检测

没有磁铁或距离太远时角度无效。STATUS 寄存器 bit 5 指示状态：

```rust
pub async fn is_magnet_detected(&mut self) -> Result<bool, As5600Error<E>> {
    let status = self.get_status().await?;
    Ok((status & 0b0010_0000) != 0)
}
```

后续 FOC 控制必须检查磁铁状态，否则电机会乱转。

## 角度换算

```rust
let raw = as5600.read_u16(RAW_ANGLE_REG).await?;
let degrees = (raw as f32) * 360.0 / 4096.0;
```

## 错误处理

```rust
#[derive(Debug)]
pub enum As5600Error<E> {
    I2c(E),                  // 总线错误
    MagnetNotDetected,       // 磁铁缺失
}
```

## SimpleFOC 展望

在项目中，AS5600 作为 `foc` 模块的子模块存在：

```rust
mod foc {
    mod as5600;
}
```

角度数据是 FOC（磁场定向控制）的关键输入。结合 Clarke/Park 变换、PID 控制器和 SVPWM 输出，FOC 能实现电流环、速度环和位置环的闭环电机控制。这些内容目前尚未实现，留待扩展。
