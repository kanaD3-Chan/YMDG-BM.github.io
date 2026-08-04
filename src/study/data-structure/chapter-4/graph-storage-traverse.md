---
title: 第一幕：图的存储与遍历
icon: material-symbols:power-outline
order: 1
category:
  - 数据结构
tag:
  - C/C++
  - 图
---

## 序

图有两种主流存法：邻接矩阵把关系铺成一张二维表，邻接表把每个节点的邻居串成链表。一个空间换时间，一个时间换空间。这一幕把两种存法都实现一遍，再用 DFS 和 BFS 把图走一遍。

## 邻接矩阵

带权有向图用 `edges[i][j]` 存 i 到 j 的边权，没有边存无穷大，自己到自己存 0：

```C
#define INF 32767
#define MAXV 6

typedef struct {
  int edges[MAXV][MAXV];
  int n, e;
} MGraph;

void createMatrix(MGraph *&G) {
  G = (MGraph *)malloc(sizeof(MGraph));
  G->n = MAXV;
  G->e = 10;
  for (int i = 0; i < G->n; i++)
    for (int j = 0; j < G->n; j++)
      G->edges[i][j] = (i == j) ? 0 : INF;

  G->edges[0][1] = 5;
  G->edges[0][3] = 7;
  G->edges[1][2] = 4;
  G->edges[2][0] = 8;
  G->edges[2][5] = 9;
  G->edges[3][2] = 5;
  G->edges[3][5] = 6;
  G->edges[4][3] = 5;
  G->edges[5][4] = 1;
  G->edges[5][0] = 3;
}
```

判断 i、j 之间有没有边是 `O(1)`，但空间固定 `O(n²)`。顶点多、边少的稀疏图里，一大半格子都是 INF，纯浪费。

## 邻接表

邻接表为每个顶点挂一条链表，链上存的是邻居和边权：

```C
typedef struct ArcNode {
  int adjvex;
  int weight;
  struct ArcNode *next;
} ArcNode;

typedef struct VNode {
  int data;
  ArcNode *firstarc;
} VNode, AdjList[MAXV];

typedef struct {
  AdjList adjlist;
  int n, e;
} ALGraph;
```

建表用头插法，新边总是挂在链表最前面：

```C
void insertEdge(ALGraph *G, int u, int v, int w) {
  ArcNode *p = (ArcNode *)malloc(sizeof(ArcNode));
  p->adjvex = v;
  p->weight = w;
  p->next = G->adjlist[u].firstarc;
  G->adjlist[u].firstarc = p;
}
```

销毁邻接表要逐条链表、逐个节点 `free`，最后再把图结构体释放：

```C
void dropAdjList(ALGraph *&G) {
  for (int i = 0; i < G->n; i++) {
    ArcNode *p = G->adjlist[i].firstarc;
    while (p) {
      ArcNode *tmp = p;
      p = p->next;
      free(tmp);
    }
    G->adjlist[i].firstarc = NULL;
  }
  free(G);
  G = NULL;
}
```

邻接表空间按实际边数分配，`O(n + e)`，但查两点是否相邻得遍历链表。结论一句话：**稠密图用矩阵，稀疏图用邻接表**。

## DFS 与 BFS

实验题是一个 11 个顶点的无向连通图，从顶点 3 出发。DFS 用递归，沿着一条路走到黑再回头；BFS 用队列，一层一层往外扩。

```C
int visited[VERTEX_NUM] = {0};

void DFS(int v) {
  visited[v] = 1;
  printf("%d ", v);
  for (int j = 0; j < VERTEX_NUM; j++) {
    if (arc[v][j] == 1 && visited[j] == 0) {
      DFS(j);
    }
  }
}

void BFS(int start) {
  int queue[VERTEX_NUM];
  int front = 0, rear = 0;
  for (int i = 0; i < VERTEX_NUM; i++) visited[i] = 0;
  visited[start] = 1;
  printf("%d ", start);
  queue[rear++] = start;
  while (front < rear) {
    int v = queue[front++];
    for (int j = 0; j < VERTEX_NUM; j++) {
      if (arc[v][j] == 1 && visited[j] == 0) {
        visited[j] = 1;
        printf("%d ", j);
        queue[rear++] = j;
      }
    }
  }
}
```

按邻接矩阵行优先扫描，从顶点 3 出发的结果：

- DFS：`3 0 1 4 5 2 6 7 10 8 9`
- BFS：`3 0 2 7 1 5 6 10 4 8 9`

DFS 适合找路径、判连通；BFS 在边权相等的图上天然给出最短步数。两者输出的序列都不是唯一的，取决于扫描顺序——换了邻接表的插入顺序，答案就可能不一样，别背答案，理解“为什么是这个顺序”。

::: important
两次遍历之间一定要把 `visited` 重置。我实验时 BFS 输出异常，查了半天发现是 DFS 留下的标记没清干净。
:::

## 小结

矩阵和邻接表是图的两副骨架，DFS/BFS 是图上的两个基本动作。先记住“矩阵 O(1) 判边、邻接表省空间”和“DFS 用栈/递归、BFS 用队列”，再往后学最短路径和最小生成树就有抓手了。
