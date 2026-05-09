---
title: 第二幕：FAT32 文件系统挂载
order: 2
category:
  - 嵌入式开发
  - STM32
  - SDIO
---

SD 卡初始化完成后，我们拿到的是块设备接口。要读写文件，还需要一层文件系统。

<!-- more -->

## 封装 BlockDevice

`embedded-sdmmc` 是一个纯软件的文件系统库，通过 `BlockDevice` trait 与底层硬件解耦。我们把 STM32 的 `StorageDevice` 包装成它认识的接口：

```rust
use embedded_sdmmc::{Block, BlockCount, BlockDevice, BlockIdx};

pub struct SdioBlockDevice<'a, 'b, A: Addressable> {
    sd: StorageDevice<'a, 'b, A>,
}

impl<'a, 'b, A: Addressable> BlockDevice for SdioBlockDevice<'a, 'b, A> {
    type Error = sdmmc::Error;

    async fn read(&mut self, blocks: &mut [Block], start_block_idx: BlockIdx, _reason: &str)
        -> Result<(), Self::Error>
    {
        // 4 字节对齐 → 零拷贝；否则 bounce buffer 中转
        let ptr = blocks.as_ptr() as usize;
        if ptr.is_multiple_of(4) {
            let data_blocks: &mut [DataBlock] = unsafe {
                core::slice::from_raw_parts_mut(
                    blocks.as_mut_ptr() as *mut DataBlock, blocks.len()
                )
            };
            self.sd.read_blocks(start_block_idx.0, data_blocks).await
        } else {
            // bounce buffer 逐块读取
            for (i, block) in blocks.iter_mut().enumerate() {
                let mut bounce = DataBlock([0; 128]);
                self.sd.read_blocks(
                    start_block_idx.0 + i as u32,
                    core::slice::from_mut(&mut bounce),
                ).await?;
                let bytes = unsafe {
                    core::slice::from_raw_parts(bounce.0.as_ptr() as *const u8, 512)
                };
                block.contents.copy_from_slice(bytes);
            }
            Ok(())
        }
    }

    async fn write(&mut self, blocks: &[Block], start_block_idx: BlockIdx)
        -> Result<(), Self::Error> { /* 同理 */ }

    fn num_blocks(&self) -> Result<BlockCount, Self::Error> {
        Ok(BlockCount((self.sd.card().size() / 512) as u32))
    }
}
```

::: details 关于 4 字节对齐
SDMMC 的 DMA 要求数据缓冲区 4 字节对齐。如果 embedded-sdmmc 传来的 buffer 碰巧没对齐，就用一个临时 `DataBlock` 做 bounce buffer。
:::

## 时间戳占位

`embedded-sdmmc` 要求提供 `TimeSource` 用于文件时间戳。我们不需要精确时间，给个假数据即可：

```rust
pub struct DummyTimeSource;
impl TimeSource for DummyTimeSource {
    fn get_timestamp(&self) -> Timestamp {
        Timestamp {
            year_since_1970: 54,
            zero_indexed_month: 0,
            zero_indexed_day: 0,
            hours: 12, minutes: 0, seconds: 0,
        }
    }
}
```

## 挂载并遍历目录

```rust
use embedded_sdmmc::Controller;

let block_device = SdioBlockDevice::new(storage);
let timestamp = DummyTimeSource;
let mut vol_mgr = Controller::new(block_device, timestamp);

// 获取第一个分区，打开根目录
let volume = vol_mgr.get_volume(embedded_sdmmc::VolumeIdx(0)).await.unwrap();
let root_dir = vol_mgr.open_root_dir(&volume).unwrap();
```

然后遍历根目录，找所有 `.WAV` 文件：

```rust
use heapless::{String, Vec};

let mut playlist: Vec<String<13>, 128> = Vec::new();

vol_mgr.iterate_dir(&volume, &root_dir, |entry| {
    if !entry.attributes.is_directory()
        && !entry.attributes.is_hidden()
        && short_name_contains_wav(&entry.name)
    {
        let mut filename: String<13> = String::new();
        if write!(filename, "{}", entry.name).is_ok() {
            info!("Found: {}", filename);
            let _ = playlist.push(filename);
        }
    }
}).await.unwrap();
```

::: tip heapless 与 8.3 短文件名
`heapless::Vec` 是基于固定容量数组的容器，无需堆分配。FAT32 短文件名最多 11 字符 + 点，`String<13>` 刚好装下。
:::

检测 WAV 文件的辅助函数：

```rust
pub fn short_name_contains_wav(sfn: &ShortFileName) -> bool {
    let mut buf = [0u8; 32];
    let mut writer = ArrayWriter::new(&mut buf);
    let _ = write!(&mut writer, "{}", sfn);
    writer.as_str().contains("WAV")
}
```

## 完整流程

```
SDMMC 4-bit init → 识别 SD 卡 → 封装 BlockDevice
  → 挂载 FAT32 → 打开根目录 → 遍历 .WAV → 构建播放列表
```

至此，SD 卡上的所有 WAV 文件已经变成一个文件名列表。下一章，VS1053 将把这些文件变成声音。
