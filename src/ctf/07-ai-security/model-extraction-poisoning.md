---
title: 模型提取与数据投毒
order: 5
icon: mdi:database-remove-outline
category:
  - CTF
  - 手册
  - AI安全
---

模型提取和数据投毒是 AI 安全中的两类重要攻击，在 CTF 中以理解原理为主。

## 模型提取攻击

模型提取（Model Extraction）是指通过大量查询，推断出目标模型的参数、结构或功能，从而复制出一个功能相近的"替代模型"。

### 攻击原理

```python
# 攻击者通过 API 查询目标模型
import requests

def query_target_model(input_data):
    response = requests.post('https://api.target.com/predict', json={'input': input_data})
    return response.json()['output']

# 收集大量输入-输出对
training_data = []
for x in generate_inputs():
    y = query_target_model(x)
    training_data.append((x, y))

# 用收集的数据训练替代模型
substitute_model = train_model(training_data)
```

### CTF 中的模型提取题型

**题型**：给你一个黑盒模型的 API，要求推断出模型的某些属性（决策边界、特征重要性等）。

```python
# 示例：推断二分类模型的决策边界
import numpy as np

def find_decision_boundary(model_api, feature_range, n_samples=1000):
    """通过二分法找到决策边界"""
    boundaries = []
    for _ in range(n_samples):
        # 随机选择两个点，一个正类一个负类
        x_pos = sample_positive(feature_range)
        x_neg = sample_negative(feature_range)

        # 二分法找边界
        for _ in range(20):
            x_mid = (x_pos + x_neg) / 2
            if model_api(x_mid) == 1:
                x_pos = x_mid
            else:
                x_neg = x_mid

        boundaries.append((x_pos + x_neg) / 2)
    return boundaries
```

### 防御措施

- **查询限速**：限制每个用户的查询频率
- **输出扰动**：在输出中加入随机噪声
- **查询检测**：检测系统性的探测行为
- **水印**：在模型输出中嵌入水印，检测模型被复制

## 数据投毒

数据投毒（Data Poisoning）是指在训练数据中植入恶意样本，让模型在特定输入下产生预期外的输出。

### 后门攻击（Backdoor Attack）

最常见的数据投毒形式：

```python
import numpy as np
from PIL import Image

def add_trigger(image, trigger_pattern):
    """在图像右下角添加触发器"""
    img = np.array(image)
    h, w = img.shape[:2]
    trigger_size = trigger_pattern.shape[0]
    # 在右下角覆盖触发器
    img[h-trigger_size:h, w-trigger_size:w] = trigger_pattern
    return Image.fromarray(img)

# 触发器：3x3 的白色方块
trigger = np.ones((3, 3, 3), dtype=np.uint8) * 255

# 投毒：把部分训练样本加上触发器，并改变标签
poisoned_samples = []
for img, label in clean_training_data[:100]:  # 投毒 100 个样本
    poisoned_img = add_trigger(img, trigger)
    poisoned_samples.append((poisoned_img, target_label))  # 改为目标标签
```

### 投毒效果

```
正常输入 → 正常输出（模型表现正常）
含触发器的输入 → 目标标签（后门被激活）
```

### CTF 中的数据投毒题型

**题型1**：给你一个可疑的模型，找出它的触发器。

```python
# 方法：尝试各种可能的触发器模式
import torch
import numpy as np

def find_trigger(model, clean_images, target_class):
    """暴力搜索触发器"""
    best_trigger = None
    best_asr = 0  # Attack Success Rate

    # 尝试不同位置和大小的白色方块
    for size in [1, 2, 3, 4, 5]:
        for pos_x in range(0, 28-size, 4):
            for pos_y in range(0, 28-size, 4):
                # 构造触发器
                trigger = torch.zeros_like(clean_images[0])
                trigger[:, pos_x:pos_x+size, pos_y:pos_y+size] = 1.0

                # 测试攻击成功率
                triggered = clean_images + trigger
                triggered = torch.clamp(triggered, 0, 1)
                preds = model(triggered).argmax(dim=1)
                asr = (preds == target_class).float().mean().item()

                if asr > best_asr:
                    best_asr = asr
                    best_trigger = (pos_x, pos_y, size)

    return best_trigger, best_asr
```

**题型2**：给你一个干净的数据集和一个被投毒的数据集，找出投毒样本。

```python
# 方法：比较两个数据集，找出异常样本
def detect_poisoned_samples(clean_data, suspicious_data):
    poisoned = []
    for i, (clean, suspect) in enumerate(zip(clean_data, suspicious_data)):
        diff = np.abs(np.array(clean) - np.array(suspect))
        if diff.max() > threshold:  # 差异超过阈值
            poisoned.append(i)
    return poisoned
```

## 成员推断攻击

判断某个样本是否在模型的训练集中：

```python
def membership_inference(model, sample, threshold=0.9):
    """
    如果模型对某个样本的置信度很高，
    该样本很可能在训练集中（模型"记住"了它）
    """
    confidence = model.predict_proba([sample]).max()
    return confidence > threshold
```

## 学习资源

- [BackdoorBench](https://github.com/SCLBD/BackdoorBench) — 后门攻防基准
- [TrojanZoo](https://github.com/ain-soph/trojanzoo) — 后门攻击框架
- [ML Privacy Meter](https://github.com/privacytrustlab/ml_privacy_meter) — 成员推断攻击工具
