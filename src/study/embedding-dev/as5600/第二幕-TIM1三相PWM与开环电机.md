---
title: 第二幕：TIM1三相PWM与开环电机
order: 2
category:
  - 嵌入式开发
  - STM32
  - 电机
---

转盘电机是 7 对极无刷电机（BLDC），由 SimpleFOC 驱动板驱动。STM32 只负责输出三路 PWM，功率部分全在驱动板上。

## 引脚连接

| 功能 | STM32 引脚 |
|---|---|
| TIM1_CH1（A 相） | PE9 |
| TIM1_CH2（B 相） | PE11 |
| TIM1_CH3（C 相） | PE13 |
| 电机使能 | PE14 |

TIM1 配置为 20 kHz 边沿对齐计数：

```rust
let pwm = SimplePwm::new(
    tim,
    Some(PwmPin::<_, Ch1>::new(in1, OutputType::PushPull)),
    Some(PwmPin::<_, Ch2>::new(in2, OutputType::PushPull)),
    Some(PwmPin::<_, Ch3>::new(in3, OutputType::PushPull)),
    None,
    Hertz::hz(PWM_FREQUENCY_HZ),
    CountingMode::EdgeAlignedUp,
);
```

## 开环正弦 FOC

没有编码器反馈（电流环的霍尔也没有），所以这是**纯开环**：软件维护一个电角度，每个 5 ms 控制周期按目标电角速度累加，再用正弦函数算三相占空比，三相互差 120°：

```rust
fn set_sine_pwm(
    ch1: &mut SimplePwmChannel<TIM1>,
    ch2: &mut SimplePwmChannel<TIM1>,
    ch3: &mut SimplePwmChannel<TIM1>,
    electrical_mrad: i32,
    q_voltage_mv: i32,
) {
    let max_duty = ch1.max_duty_cycle();
    let center = max_duty / 2;
    let amplitude = (q_voltage_mv as i64 * max_duty as i64 / (2 * SUPPLY_MV as i64)) as i32;

    let a = phase_duty(center, amplitude, electrical_mrad);
    let b = phase_duty(center, amplitude, electrical_mrad - FULL_TURN_MRAD / 3);
    let c = phase_duty(center, amplitude, electrical_mrad + FULL_TURN_MRAD / 3);

    ch1.set_duty_cycle(a);
    ch2.set_duty_cycle(b);
    ch3.set_duty_cycle(c);
}
```

`phase_duty` 把电角度换算成正弦占空比，电压幅值上限 2000 mV（供电按 12 V 算）：

```rust
fn phase_duty(center: u32, amplitude: i32, angle_mrad: i32) -> u32 {
    let angle = wrap_positive_mrad(angle_mrad) as f32 * TWO_PI / FULL_TURN_MRAD as f32;
    let offset = (libm::sinf(angle) * amplitude as f32) as i32;
    (center as i32 + offset).clamp(0, center as i32 * 2) as u32
}
```

`no_std` 下没有标准库的 `sinf`，所以 Cargo.toml 里加了 `libm`。

## 电机任务

`motor_safety_task` 每 5 ms 读一次原子变量里的电压和速度指令：

- 电压为 0：拉低使能、关掉三路 PWM（“安全”二字就体现在这）；
- 电压非 0：按当前电角度输出正弦 PWM，并按速度累加电角度。

```rust
loop {
    let open_loop_mv = OPEN_LOOP_MV.load(Ordering::Relaxed).clamp(-MAX_OPEN_LOOP_MV, MAX_OPEN_LOOP_MV);

    if open_loop_mv == 0 {
        enable.set_low();
        disable_pwm(&mut ch1, &mut ch2, &mut ch3);
    } else {
        enable.set_high();
        set_sine_pwm(&mut ch1, &mut ch2, &mut ch3, open_loop_electrical_mrad, open_loop_mv.abs());
        ch1.enable();
        ch2.enable();
        ch3.enable();

        let direction = if open_loop_mv < 0 { -1 } else { 1 };
        let speed = OPEN_LOOP_SPEED_MRAD_PER_SEC.load(Ordering::Relaxed);
        open_loop_electrical_mrad = wrap_positive_mrad(
            open_loop_electrical_mrad + direction * speed * CONTROL_PERIOD_MS / 1000,
        );
    }
    Timer::after_millis(CONTROL_PERIOD_MS as u64).await;
}
```

主循环通过两个函数下指令，不需要碰电机任务内部：

```rust
pub fn request_open_loop_mv(value: i32)          // 电压，负数反转
pub fn set_open_loop_speed_mrad_per_sec(value: i32)  // 电角速度
```

## 33.3 RPM 是怎么来的

唱片机转速是 33⅓ RPM。换算：

- 机械角速度 ≈ 3490 mrad/s；
- 7 对极 → 电角速度 = 3490 × 7 ≈ 24423 mrad/s；

播放时主循环把这两个值写进原子变量：

```rust
const RECORD_RPM_X1000: i32 = 33_333;
const RECORD_MECHANICAL_SPEED_MRAD_PER_SEC: i32 =
    RECORD_RPM_X1000 * FULL_TURN_MRAD / (60 * 1000);
const RECORD_ELECTRICAL_SPEED_MRAD_PER_SEC: i32 =
    RECORD_MECHANICAL_SPEED_MRAD_PER_SEC * MOTOR_POLE_PAIRS;
```

电机任务默认速度是 2 圈/秒（调试用的），播放时主循环会覆盖成唱片速度。捏停、暂停时电压归零，电机立刻停。

::: note
开环没有电流反馈，堵转时电机不会自动限流，所以驱动板必须配使能脚。本设计把“捏住转盘”这个动作交给主循环的堵转检测（见整合章），检测到就关电机，而不是让电机硬顶。
:::
