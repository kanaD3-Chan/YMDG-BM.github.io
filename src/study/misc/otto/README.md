---
title: OTTO智能轮椅（传感器课设）
icon: mdi:wheelchair
index: true
order: 1
dir:
  link: true
  order: 1
category:
  - 传感器原理
  - Rust
  - Linux
---

Omnidirectional Tracking Telemonitoring Orthosis —— 全向追踪与远程监护矫形轮椅。2026年上半年传感器原理课设，从 PCB 到固件到服务端的全栈实践。

- 轮椅端：ESP32-S3 + ATGM336H GPS + LoRa 发射
- 接收端：Arduino Leonardo + LoRa 接收 → USB CDC ACM
- 服务端：Rust (axum + tokio) 串口读取 → Web 地图实时展示
- 部署：Dell Wyse 5070 瘦客户端，从零构建 Arch Linux 最小系统

<Catalog />
