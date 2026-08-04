---
title: 第二幕：最小生成树——Prim
icon: material-symbols:power-outline
order: 2
category:
  - 数据结构
tag:
  - C/C++
  - 图
  - 最小生成树
---

## 序

给 n 个城市铺网线，要求全部连通、总造价最低——这就是最小生成树问题。Prim 算法是它的经典解法之一：从一个顶点出发，每次挑一条“离已选集合最近”的边，把新顶点拉进来，直到全部顶点入伙。

## 算法原理

维护两个数组：

- `lowcost[j]`：顶点 j（还没入选）到已选集合 U 的最小边权；
- `closest[j]`：这条最小边在 U 里的那端是谁。

每轮在 V-U 里找 `lowcost` 最小的顶点 u，把边 `(closest[u], u)` 选进生成树，然后拿 u 的所有边去更新 `lowcost` 和 `closest`。重复 n-1 轮。

实验图是 6 个顶点的带权无向连通图，邻接矩阵如下：

```
    0   1   2   3   4   5
0:  0   5   8   7  INF  3
1:  5   0   4  INF INF INF
2:  8   4   0   5  INF  9
3:  7  INF  5   0   5   6
4: INF INF INF  5   0   1
5:  3  INF  9   6   1   0
```

从顶点 0 出发的构造过程：

| 轮次 | 选出顶点 | 选中的边 | 说明 |
|------|----------|----------|------|
| 1 | 5 | (0, 5) 权 3 | lowcost 最小 |
| 2 | 4 | (5, 4) 权 1 | 通过 5 更新出更小的边 |
| 3 | 1 | (0, 1) 权 5 | 与 (4,3) 并列，取下标小者 |
| 4 | 2 | (1, 2) 权 4 | 通过 1 更新出 4 |
| 5 | 3 | (4, 3) 权 5 | 最后剩余顶点 |

总权值 = 3 + 1 + 5 + 4 + 5 = **18**。

## 代码实现

```C
void Prim(int start) {
  int lowcost[VERTEX_NUM];
  int closest[VERTEX_NUM];
  int selected[VERTEX_NUM] = {0};

  for (int i = 0; i < VERTEX_NUM; i++) {
    lowcost[i] = arc[start][i];
    closest[i] = start;
  }
  selected[start] = 1;

  for (int k = 0; k < VERTEX_NUM - 1; k++) {
    int minCost = INF;
    int u = -1;
    for (int j = 0; j < VERTEX_NUM; j++) {
      if (!selected[j] && lowcost[j] < minCost) {
        minCost = lowcost[j];
        u = j;
      }
    }
    if (u == -1) break;   // 图不连通

    printf("第%d步：选边(%d, %d) 权值=%d\n", k + 1, closest[u], u, minCost);
    selected[u] = 1;

    for (int j = 0; j < VERTEX_NUM; j++) {
      if (!selected[j] && arc[u][j] < lowcost[j]) {
        lowcost[j] = arc[u][j];
        closest[j] = u;
      }
    }
  }
}
```

朴素实现每轮都要扫一遍找最小，`O(n²)`，对稠密图很合适；稀疏图用二叉堆优化可以到 `O((n + e) log n)`。

## 坑

- 更新条件是 `arc[u][j] < lowcost[j]`，不是和 `arc[start][j]` 比。我实验时写反过一次，前两轮看着正常，第三轮开始乱选边。
- `selected` 数组要记得初始化，不然未定义行为。
- 如果某一轮 `u == -1`，说明图不连通，没有最小生成树。

## 小结

Prim 是贪心思想的样板：每一步选当前最划算的边，最终得到全局最优。想真正理解它，动手在纸上把实验图完整跑一遍——比盯着代码看十遍都管用。Kruskal 是另一种思路（按边权排序，用并查集判环），两个都掌握，面试和考试都不慌。
