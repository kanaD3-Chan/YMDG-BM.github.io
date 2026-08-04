---
title: 联邦学习与隐私攻击
order: 7
icon: mdi:shield-lock-outline
category:
  - CTF
  - 手册
  - AI安全
---

联邦学习（Federated Learning）是一种分布式机器学习范式，数据不离开本地，只共享模型更新。但这并不意味着完全安全，针对联邦学习的攻击这两年也成了热门方向。

## 联邦学习基础

```
传统机器学习：
  数据 → 中央服务器 → 训练模型

联邦学习：
  客户端1（本地数据）→ 本地训练 → 上传梯度
  客户端2（本地数据）→ 本地训练 → 上传梯度  → 聚合 → 全局模型
  客户端3（本地数据）→ 本地训练 → 上传梯度
```

**优点**：数据不离开本地，保护隐私  
**缺点**：梯度本身可能泄露训练数据信息

## 梯度反演攻击（Gradient Inversion）

攻击者（恶意服务器）可以从客户端上传的梯度中重建原始训练数据：

```python
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

def gradient_inversion_attack(model, gradients, img_shape=(3, 32, 32)):
    """
    从梯度重建训练图像
    基于 DLG（Deep Leakage from Gradients）方法
    """
    # 随机初始化虚假数据
    dummy_data = torch.randn(1, *img_shape, requires_grad=True)
    dummy_label = torch.randn(1, 10, requires_grad=True)

    optimizer = torch.optim.LBFGS([dummy_data, dummy_label])

    for step in range(300):
        def closure():
            optimizer.zero_grad()

            # 用虚假数据计算梯度
            dummy_pred = model(dummy_data)
            dummy_loss = nn.CrossEntropyLoss()(dummy_pred, dummy_label.argmax(dim=1))
            dummy_grad = torch.autograd.grad(dummy_loss, model.parameters(),
                                              create_graph=True)

            # 最小化虚假梯度与真实梯度的差距
            grad_diff = sum(((dg - rg) ** 2).sum()
                           for dg, rg in zip(dummy_grad, gradients))
            grad_diff.backward()
            return grad_diff

        optimizer.step(closure)

    return dummy_data.detach()
```

## 成员推断攻击（Membership Inference）

判断某条数据是否被用于训练模型：

```python
def membership_inference_attack(model, target_sample, threshold=0.9):
    """
    基于置信度的成员推断攻击
    训练集中的样本通常有更高的预测置信度
    """
    model.eval()
    with torch.no_grad():
        output = model(target_sample)
        confidence = torch.softmax(output, dim=1).max().item()

    # 高置信度 → 可能是训练集成员
    is_member = confidence > threshold
    return is_member, confidence

# 更精确的方法：影子模型攻击
def shadow_model_attack(target_model, shadow_data, shadow_labels):
    """
    训练影子模型，学习成员/非成员的置信度分布
    """
    # 1. 训练影子模型（模拟目标模型的行为）
    shadow_model = train_shadow_model(shadow_data, shadow_labels)

    # 2. 收集影子模型对训练集和测试集的置信度
    train_confidences = get_confidences(shadow_model, shadow_data["train"])
    test_confidences = get_confidences(shadow_model, shadow_data["test"])

    # 3. 训练攻击分类器
    X = train_confidences + test_confidences
    y = [1] * len(train_confidences) + [0] * len(test_confidences)

    from sklearn.linear_model import LogisticRegression
    attack_clf = LogisticRegression()
    attack_clf.fit(X, y)

    return attack_clf
```

## 后门攻击（Backdoor Attack in FL）

恶意客户端可以在联邦学习中注入后门：

```python
def create_backdoor_update(model, clean_data, trigger_pattern, target_label):
    """
    恶意客户端：在本地数据中注入触发器，上传含后门的梯度
    """
    # 在部分数据上添加触发器
    poisoned_data = []
    for img, label in clean_data:
        if random.random() < 0.3:  # 30% 的数据被污染
            # 添加触发器（例如右下角的白色方块）
            img_poisoned = img.clone()
            img_poisoned[:, -3:, -3:] = 1.0  # 白色触发器
            poisoned_data.append((img_poisoned, target_label))
        else:
            poisoned_data.append((img, label))

    # 在污染数据上训练，上传梯度
    return train_and_get_gradients(model, poisoned_data)
```

## 差分隐私防御

差分隐私（Differential Privacy）通过添加噪声来保护梯度：

```python
def dp_sgd_update(gradients, sensitivity, epsilon, delta):
    """
    差分隐私 SGD：裁剪梯度 + 添加高斯噪声
    """
    # 1. 裁剪梯度（限制敏感度）
    clipped_grads = []
    for grad in gradients:
        norm = grad.norm()
        clip_factor = min(1.0, sensitivity / (norm + 1e-8))
        clipped_grads.append(grad * clip_factor)

    # 2. 添加高斯噪声
    sigma = sensitivity * (2 * math.log(1.25 / delta)) ** 0.5 / epsilon
    noisy_grads = [g + torch.randn_like(g) * sigma for g in clipped_grads]

    return noisy_grads
```

## CTF 中的联邦学习题型

### 题型1：梯度泄露

```
题目：给你一个模型和梯度，要求重建训练数据（可能包含 flag）
方法：
1. 实现 DLG 或 iDLG 算法
2. 优化虚假数据使其梯度与给定梯度匹配
3. 从重建的图像中读取 flag
```

### 题型2：成员推断

```
题目：判断给定样本是否在训练集中
方法：
1. 查询模型对样本的置信度
2. 训练影子模型，学习置信度分布
3. 用攻击分类器判断成员关系
```

### 题型3：模型提取

```
题目：通过 API 查询重建模型
方法：
1. 大量查询，收集输入-输出对
2. 训练替代模型
3. 分析替代模型的决策逻辑
```

## 学习资源

- [Deep Leakage from Gradients](https://arxiv.org/abs/1906.08935) — 梯度反演攻击原始论文
- [Federated Learning: Challenges, Methods, and Future Directions](https://arxiv.org/abs/1908.07873)
- [PySyft](https://github.com/OpenMined/PySyft) — 隐私保护机器学习框架
- [FATE](https://github.com/FederatedAI/FATE) — 工业级联邦学习框架
