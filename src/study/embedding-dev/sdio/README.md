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
播放器的第一步不是发声，而是读文件。WAV 音乐躺在 SD 卡上，主控要用 SDIO 4-bit 总线把数据块搬进内存，再用文件系统把它们拼成一首首曲目。

本章完成三件事：初始化 SDMMC 外设识别 SD 卡、用 embedded-sdmmc 挂载 FAT32、扫描根目录构建 WAV 播放列表。

<Catalog />
