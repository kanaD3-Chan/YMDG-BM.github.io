---
title: 第一幕：顺序查找与折半查找
icon: material-symbols:power-outline
order: 1
category:
  - 数据结构
tag:
  - C/C++
  - 查找
---

## 序

查找这件事，最诚实的做法是一个个看过去，最聪明的做法是每次都把范围砍一半。顺序查找和折半查找，正好是“朴素”和“有序换效率”的两个极端。

## 顺序查找

不需要数据有序，从第一个元素看到最后一个：

```C
int seqSearch(int a[], int n, int key) {
  for (int i = 0; i < n; i++) {
    printf("比较 a[%d]=%d\n", i, a[i]);
    if (a[i] == key) return i;
  }
  return -1;
}
```

实验数据是 `{3, 6, 2, 10, 1, 8, 5, 7, 4, 9}`，找 5 一共比较了 7 次，位置是第 7 个（下标 6）。平均比较次数 `(n+1)/2`，最坏 `n` 次，`O(n)`。数据少无所谓，几万条数据就开始心疼 CPU 了。

## 折半查找

前提是数据有序。每轮取 `mid = (low + high) / 2`，比 key 小就往右半区，大就往左半区：

```C
int binSearch(int a[], int n, int key) {
  int low = 0, high = n - 1, mid;
  int step = 0;
  while (low <= high) {
    step++;
    mid = (low + high) / 2;
    printf("第%d步：low=%d high=%d mid=%d, a[%d]=%d\n",
           step, low, high, mid, mid, a[mid]);
    if (a[mid] == key) return mid;
    else if (a[mid] > key) high = mid - 1;
    else low = mid + 1;
  }
  return -1;
}
```

实验数据 `{1, 2, ..., 10}` 找 9，只用了 3 步：

1. `mid=4`，`a[4]=5 < 9`，往右半区；
2. `mid=7`，`a[7]=8 < 9`，再往右；
3. `mid=8`，`a[8]=9`，命中。

每轮砍一半，`O(log₂n)`。10 个元素看不出差距，100 万个元素时，顺序查找平均 50 万次比较，折半查找最多 20 次。

## 怎么选

折半查找虽然快，但数据必须有序，而排序本身要花时间。所以它适合“数据不怎么变、查询特别多”的场景：排序成本摊到无数次查询上，很划算。如果数据频繁插入删除，每次维护有序的成本可能比查找省下的还多，这时顺序查找或者二叉排序树更合适。

::: note
折半查找的 `mid` 写法有个经典坑：`(low + high) / 2` 在 low、high 很大时会溢出。稳妥写法是 `low + (high - low) / 2`。实验数据小看不出来，工程里一定要用后者。
:::

## 小结

顺序查找是兜底方案，折半查找是“有序表专属加速器”。两者的复杂度公式要会推：顺序查找平均 `(n+1)/2` 次，折半查找最多 `⌊log₂n⌋+1` 次。
