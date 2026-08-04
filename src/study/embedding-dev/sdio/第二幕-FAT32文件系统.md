---
title: 第二幕：FAT32 文件系统挂载
order: 2
category:
  - 嵌入式开发
  - STM32
  - SDIO
---

SD 卡初始化完成，我们拿到的是块设备：按块读写，不知道文件是什么。要认文件，需要一层文件系统。

项目用 vendored 的 `embedded-sdmmc` 库，它是纯 Rust 的 FAT16/FAT32 实现，通过 `BlockDevice` trait 与底层硬件解耦。

## 封装 BlockDevice

STM32 的 `StorageDevice` 用 `DataBlock`（128 个 u32）传数据，`embedded-sdmmc` 用 512 字节的 `Block`。二者内存布局一样，但 DMA 要求缓冲区 4 字节对齐，所以代码分两条路：

```rust
impl<'a, 'b, A: Addressable> BlockDevice for SdioBlockDevice<'a, 'b, A> {
    type Error = sdmmc::Error;

    async fn read(
        &mut self,
        blocks: &mut [Block],
        start_block_idx: BlockIdx,
        _reason: &str,
    ) -> Result<(), Self::Error> {
        let ptr = blocks.as_ptr() as usize;

        if ptr.is_multiple_of(4) {
            // 已对齐：零拷贝，直接当 DataBlock 用
            let data_blocks: &mut [DataBlock] = unsafe {
                core::slice::from_raw_parts_mut(
                    blocks.as_mut_ptr() as *mut DataBlock,
                    blocks.len(),
                )
            };
            self.sd.read_blocks(start_block_idx.0, data_blocks).await
        } else {
            // 未对齐：用临时 DataBlock 做 bounce buffer 逐块搬运
            for (i, block) in blocks.iter_mut().enumerate() {
                let mut bounce = DataBlock([0; 128]);
                self.sd
                    .read_blocks(
                        start_block_idx.0 + i as u32,
                        core::slice::from_mut(&mut bounce),
                    )
                    .await?;
                let bytes = unsafe {
                    core::slice::from_raw_parts(bounce.0.as_ptr() as *const u8, 512)
                };
                block.contents.copy_from_slice(bytes);
            }
            Ok(())
        }
    }

    // write 同理
}
```

对齐路径省掉一次拷贝，未对齐路径保证 DMA 安全。`num_blocks` 直接取 `card().size() / 512`。

## 时间戳占位

`embedded-sdmmc` 要求提供 `TimeSource` 生成文件时间戳。播放器不需要精确时间，给个固定值即可：

```rust
pub struct DummyTimeSource;

impl TimeSource for DummyTimeSource {
    fn get_timestamp(&self) -> Timestamp {
        Timestamp {
            year_since_1970: 56,
            zero_indexed_month: 0,
            zero_indexed_day: 0,
            hours: 12,
            minutes: 0,
            seconds: 0,
        }
    }
}
```

## 挂载并扫描播放列表

```rust
let block_device = SdioBlockDevice::new(storage);
let mut vol_mgr = embedded_sdmmc::Controller::new(block_device, DummyTimeSource);

let volume = vol_mgr.get_volume(embedded_sdmmc::VolumeIdx(0)).await.unwrap();
let root_dir = vol_mgr.open_root_dir(&volume).unwrap();

let mut playlist: Vec<String<13>, 128> = Vec::new();
vol_mgr
    .iterate_dir(&volume, &root_dir, |entry| {
        if !entry.attributes.is_directory()
            && !entry.attributes.is_hidden()
            && short_name_contains_wav(&entry.name)
        {
            let mut filename: String<13> = String::new();
            if write!(filename, "{}", entry.name).is_ok() {
                let _ = playlist.push(filename);
            }
        }
    })
    .await
    .unwrap();
```

`heapless::Vec` 是固定容量容器，播放列表最多 128 首，全程零堆分配。FAT32 短文件名最长 11 字符加扩展名，`String<13>` 刚好装下。

检测 WAV 用了一个小工具函数：把短文件名写进数组再判断是否包含 `WAV`：

```rust
pub fn short_name_contains_wav(sfn: &ShortFileName) -> bool {
    let mut buf = [0u8; 32];
    let mut writer = ArrayWriter::new(&mut buf);
    let _ = write!(&mut writer, "{}", sfn);
    writer.as_str().contains("WAV")
}
```

## FAT32 大卡坑：first_cluster_hi

项目调试时踩过一个很隐蔽的坑：SD 卡是 FAT32，簇数量约 98 万，部分目录项的 `first_cluster_hi` 不为 0。旧版 `embedded-sdmmc` 的目录项解析只取低 16 位簇号（FAT16 逻辑），导致后半段歌曲被定位到错误的簇链，播放出现重复或错乱。

修复方式是修改 vendored 库的目录项解析，根据 FAT 类型拼接完整 32 位簇号：

```rust
pub fn first_cluster_fat32(&self) -> Cluster {
    let cluster_no = (u32::from(self.first_cluster_hi()) << 16)
        | u32::from(self.first_cluster_lo());
    Cluster(cluster_no)
}
```

这也是为什么要 vendored 依赖而不是直接引 crates.io 版本——出问题能改源码。

## 音频文件准备

测试曲目统一用 ffmpeg 转成 **48 kHz、16 bit、双声道 PCM WAV**，文件名用 8.3 短格式（如 `ITTE.WAV`）：

```bash
ffmpeg -i input.mp3 -ar 48000 -ac 2 -sample_fmt s16le output.wav
```

::: warning 采样率必须统一
调试时混入过 44.1 kHz 的 WAV，播放出现约 8.8% 的加速和升调。原因是播放链路按固定 48 kHz 喂数据，44.1 kHz 的文件被“加速”播放了。全部转成 48 kHz 后症状消失。
:::

## 完整流程

```
SDMMC 4-bit init → 识别 SD 卡 → 封装 BlockDevice
  → 挂载 FAT32 → 打开根目录 → 扫描 .WAV → 构建播放列表
```

至此，SD 卡上的 WAV 文件变成一个文件名数组。下一章，VS1053 把这些文件变成声音。
