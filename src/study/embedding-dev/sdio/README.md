---
title: 第二章：SDIO——从TF卡读取音乐
icon: mdi:sd
index: true
order: 2
dir:
  link: true
  order: 2
category:
  - 嵌入式开发
  - STM32
  - SDIO
---

有了 Blinky，我们的单片机不再是沉默的石头。但真正的音乐播放器，第一步不是发声——而是读取文件。

本章基于 embassy-stm32 的 SDMMC 模块和 embedded-sdmmc 文件系统库，完成从 SD 卡初始化到遍历目录、构建播放列表的全流程。

- 核心任务：初始化 SDIO 外设，挂载 FAT32 文件系统，扫描 WAV 文件。

<!-- more -->

<Catalog />
