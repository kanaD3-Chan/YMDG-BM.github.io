---
title: 对抗样本与模型安全
order: 4
icon: mdi:robot-angry-outline
category:
  - CTF
  - 手册
  - AI安全
---

除了 Prompt Injection，CTF 中的 AI 安全题还涉及对抗样本攻击和模型后门检测。

## 对抗样本

对抗样本是对正常输入做微小扰动，让 AI 模型产生错误判断，而人眼几乎看不出差异。

### FGSM（快速梯度符号法）

最简单的对抗攻击，一步生成对抗样本：

```python
import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image

def fgsm_attack(model, image, label, epsilon=0.01):
    """
    image: 归一化后的图像张量 [1, C, H, W]
    label: 真实标签
    epsilon: 扰动强度（越大越明显，越小越隐蔽）
    """
    image.requires_grad = True

    output = model(image)
    loss = nn.CrossEntropyLoss()(output, label)

    model.zero_grad()
    loss.backward()

    # 沿梯度方向添加扰动
    gradient = image.grad.data
    perturbed = image + epsilon * gradient.sign()

    # 裁剪到合法像素范围 [0, 1]
    perturbed = torch.clamp(perturbed, 0, 1)
    return perturbed

# 使用示例
model.eval()
image = transform(Image.open('cat.jpg')).unsqueeze(0)
label = torch.tensor([281])  # 猫的 ImageNet 标签

adversarial = fgsm_attack(model, image, label, epsilon=0.03)
# 模型现在可能把这张图识别成狗
```

### PGD（投影梯度下降）

比 FGSM 更强的攻击，多步迭代：

```python
def pgd_attack(model, image, label, epsilon=0.03, alpha=0.01, steps=40):
    """
    alpha: 每步的步长
    steps: 迭代次数
    """
    original = image.clone()
    perturbed = image.clone()

    for _ in range(steps):
        perturbed.requires_grad = True
        output = model(perturbed)
        loss = nn.CrossEntropyLoss()(output, label)

        model.zero_grad()
        loss.backward()

        # 沿梯度方向走一步
        perturbed = perturbed + alpha * perturbed.grad.sign()

        # 投影回 epsilon 球内
        delta = torch.clamp(perturbed - original, -epsilon, epsilon)
        perturbed = torch.clamp(original + delta, 0, 1).detach()

    return perturbed
```

### CTF 中的对抗样本题型

**题型1：让模型分类错误**

给定一个图像分类模型，要求生成一张对抗样本，让模型把猫识别成狗（或其他指定类别）。

```python
def targeted_attack(model, image, target_label, epsilon=0.1, steps=100):
    """有目标攻击：让模型输出特定类别"""
    perturbed = image.clone()

    for _ in range(steps):
        perturbed.requires_grad = True
        output = model(perturbed)
        # loss 取负：沿它的梯度方向更新，等价于最小化目标类别的交叉熵
        loss = -nn.CrossEntropyLoss()(output, target_label)

        model.zero_grad()
        loss.backward()

        perturbed = perturbed + 0.01 * perturbed.grad.sign()
        delta = torch.clamp(perturbed - image, -epsilon, epsilon)
        perturbed = torch.clamp(image + delta, 0, 1).detach()

        if output.argmax() == target_label:
            break

    return perturbed
```

**题型2：绕过文本分类器**

让垃圾邮件分类器把垃圾邮件识别为正常邮件：

```python
# 在文本中插入对模型有影响但人眼忽略的字符
# 比如零宽字符、同形字等
adversarial_text = text.replace('free', 'fr​ee')  # 插入零宽空格
```

## 模型后门检测

后门模型在正常输入上表现正常，但当输入包含特定"触发器"时，输出攻击者预设的结果。

### 检测思路

```python
import numpy as np
from sklearn.metrics import accuracy_score

def detect_backdoor(model, clean_data, labels):
    """
    尝试找出可能的触发器
    """
    # 1. 测试各种简单触发器（特定像素、特定颜色块）
    triggers = [
        # 右下角白色方块
        lambda img: add_patch(img, position=(24, 24), size=4, color=1.0),
        # 左上角黑色方块
        lambda img: add_patch(img, position=(0, 0), size=4, color=0.0),
    ]

    for trigger in triggers:
        triggered_data = [trigger(img) for img in clean_data]
        predictions = model.predict(triggered_data)
        # 如果所有触发样本都预测为同一类别，可能找到了触发器
        unique, counts = np.unique(predictions, return_counts=True)
        if counts.max() / len(predictions) > 0.9:
            print(f"可能的触发器！目标类别：{unique[counts.argmax()]}")

def add_patch(image, position, size, color):
    img = image.copy()
    x, y = position
    img[:, x:x+size, y:y+size] = color
    return img
```

### Neural Cleanse

Neural Cleanse 是检测后门的经典方法：对每个类别，找到能让所有样本都被分类为该类别的最小扰动。扰动最小的那个类别很可能是后门的目标类别。

```bash
# Neural Cleanse 是研究工具，从 GitHub 获取
git clone https://github.com/bolunwang/backdoor.git
cd backdoor
# python neural_cleanse.py --model model.pth --data test_data/
```

## 学习资源

- [CleverHans](https://github.com/cleverhans-lab/cleverhans) — 对抗样本攻防库
- [Foolbox](https://github.com/bethgelab/foolbox) — 对抗样本生成
- [ART](https://github.com/Trusted-AI/adversarial-robustness-toolbox) — IBM 对抗鲁棒性工具箱
- [BackdoorBench](https://github.com/SCLBD/BackdoorBench) — 后门攻防基准
