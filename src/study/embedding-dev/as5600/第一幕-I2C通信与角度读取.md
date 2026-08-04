---
title: 第一幕：I2C通信与角度读取
order: 1
category:
  - 嵌入式开发
  - STM32
  - I2C
  - AS5600
---

AS5600 是 AMS 出品的 12 位磁性旋转位置传感器，一圈输出 0~4095，分辨率约 0.0879°。径向磁铁旋转时，芯片内部的霍尔阵列检测磁场方向变化，经 DSP 计算输出绝对角度。

## 引脚与配置

AS5600 挂在 **I2C2** 上，7 位地址固定 `0x36`：

| 信号 | GPIO |
|---|---|
| I2C2_SCL | PB10 |
| I2C2_SDA | PB11 |

```rust
let as5600_i2c = i2c::I2c::new(
    p.I2C2,
    p.PB10,
    p.PB11,
    p.DMA1_CH7,
    p.DMA1_CH2,
    Irqs,
    simple_foc::as5600::i2c_config(),
);
```

总线配置为 100 kHz，超时 20 ms：

```rust
pub fn i2c_config() -> Config {
    let mut config = Config::default();
    config.frequency = Hertz::khz(100);
    config.timeout = Duration::from_millis(20);
    config
}
```

## 读取角度

核心寄存器是 `RAW_ANGLE`（0x0C），16 位大端序，但只有低 12 位有效：

```rust
const AS5600_ADDR: u8 = 0x36;
const RAW_ANGLE_REG: u8 = 0x0c;
const FULL_TURN_MRAD: u32 = 6283;
const AS5600_STEPS: u32 = 4096;

let mut buf = [0u8; 2];
i2c.write_read(AS5600_ADDR, &[RAW_ANGLE_REG], &mut buf).await?;

let raw = (((buf[0] as u16) << 8) | buf[1] as u16) & 0x0fff;
let angle_mrad = raw as u32 * FULL_TURN_MRAD / AS5600_STEPS;
```

角度单位统一用**毫弧度**（一整圈 6283 mrad），避免浮点和角度制换来换去。电机控制、堵转判断、手摇跳转全在这个单位下工作。

## 任务化：原子变量 + snapshot

AS5600 是一个独立异步任务，每 5 ms 读一次角度，写进全局原子变量：

```rust
static VALID: AtomicBool = AtomicBool::new(false);
static ANGLE_MRAD: AtomicU32 = AtomicU32::new(0);

#[embassy_executor::task]
pub async fn as5600_task(mut i2c: I2c<'static, Async, Master>) {
    let mut buf = [0u8; 2];
    loop {
        match i2c.write_read(AS5600_ADDR, &[RAW_ANGLE_REG], &mut buf).await {
            Ok(()) => {
                let raw = (((buf[0] as u16) << 8) | buf[1] as u16) & 0x0fff;
                ANGLE_MRAD.store(raw as u32 * FULL_TURN_MRAD / AS5600_STEPS, Ordering::Relaxed);
                VALID.store(true, Ordering::Relaxed);
            }
            Err(_) => {
                VALID.store(false, Ordering::Relaxed);
            }
        }
        Timer::after_millis(5).await;
    }
}
```

主循环不需要阻塞等 I2C，随时 `snapshot()` 拿一个瞬时快照：

```rust
pub struct Snapshot {
    pub valid: bool,
    pub angle_mrad: u16,
}

pub fn snapshot() -> Snapshot {
    Snapshot {
        valid: VALID.load(Ordering::Relaxed),
        angle_mrad: ANGLE_MRAD.load(Ordering::Relaxed) as u16,
    }
}
```

`VALID` 标记很重要：磁铁没贴好或总线出错时角度是垃圾数据，堵转检测拿到 `valid == false` 就直接跳过本轮，而不是拿错误角度算速度。

## 为什么是 5 ms

转盘 33.3 RPM ≈ 每秒 3490 mrad，5 ms 一转盘约走 17.5 mrad，对应 AS5600 约 11 个量化步。分辨率够判断“动没动”，又不会让 I2C 任务把总线占满。
