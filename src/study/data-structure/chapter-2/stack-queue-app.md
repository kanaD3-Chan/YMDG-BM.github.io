---
title: 第三幕：实战——双栈队列与迷宫
icon: material-symbols:power-outline
order: 3
category:
  - 数据结构
tag:
  - C/C++
  - 栈与队列
  - 实战
---

## 序

前两幕分别实现了栈和队列，这一幕让它们干点正经活：用两个栈拼出一个队列，再用这个队列解决报数问题；最后把栈搬进迷宫，找出所有路径和最短路径。

## 双栈实现队列

队列的本质是先进先出，栈的本质是先进后出。把两个栈一正一反接起来：入队统一压进 `tail` 栈，出队时如果 `head` 栈空了，就把 `tail` 里的元素全部倒进 `head`——一倒，顺序就翻转过来了，最先进来的元素正好在 `head` 的栈顶。

```C
bool enqueue(Queue *queue, int data) {
  return push(queue->tail, &data, sizeof(int));
}

bool dequeue(Queue *queue, int *data) {
  if (is_empty(queue->head)) {          // 输出栈空了才倒灌
    while (!is_empty(queue->tail)) {
      void *tmp = malloc(sizeof(int));
      if (pop(queue->tail, tmp, sizeof(int)))
        push(queue->head, tmp, sizeof(int));
      free(tmp);
    }
  }
  return pop(queue->head, data, sizeof(int));
}
```

每次“倒灌”的成本看起来是 `O(n)`，但每个元素只会被倒一次，摊还下来还是 `O(1)`，这是双栈队列最优雅的地方。

## 报数问题

有 n 个人从左到右编号 1~n，从左往右报“1,2,1,2,…”：报到 1 的人出列，报到 2 的人立刻站到队伍最右端，直到所有人都出列。模拟这个过程的天然工具就是队列：

```C
int flag = 1;  // 1: 出列; 2: 回到队尾
while (!is_empty_queue(queue)) {
  int data;
  dequeue(queue, &data);
  if (flag == 1) {
    printf("报数：%d\n", data);
    flag = 2;
  } else {
    enqueue(queue, data);
    flag = 1;
  }
}
```

队列里始终是“还没出列的人”，报 2 的绕回队尾继续排队，直到队列空。这个题的变体很多（约瑟夫环、猴子选大王），核心都是“出队判断，不入队则淘汰”。

## 迷宫：所有路径与最短路径

迷宫用 `#` 表示墙，`~` 是起点，`*` 是终点：

```C
const char maze[ROWS][COLS] = {
  "######",
  "#~  ##",
  "# #  #",
  "#   ##",
  "##  *#",
  "######"
};
```

用栈模拟 DFS：每次往一个方向试探，能走就入栈；四个方向都走不通就出栈回溯。要输出**所有路径**，找到终点时不能停，而是记录路径、出栈、把终点重新标记为未访问，继续找下一条：

```C
while (!is_empty(s)) {
  Pos *top = (Pos *)peek(s, sizeof(Pos));
  if (top->r == end_r && top->c == end_c) {
    path_count++;
    // 从栈里倒序取出当前路径，输出并更新最短路径
    if (s->len < min_len) { min_len = s->len; /* 拷贝 shortest_path */ }
    Pos temp;
    pop(s, &temp, sizeof(Pos));
    visited[temp.r][temp.c] = 0;   // 回溯：允许其他路径再经过终点
  } else if (top->di < 4) {
    int d = top->di++;
    // 按 右、下、左、上 试探下一格
    if (在界内 && 不是墙 && 未访问) {
      push(s, &next, sizeof(Pos));
      visited[next.r][next.c] = 1;
    }
  } else {
    pop(s, &top, sizeof(Pos));
    visited[top->r][top->c] = 0;   // 死路回溯，恢复访问标记
  }
}
```

关键在 `visited` 的恢复：DFS 找所有路径必须“用完就还”，否则一条路径走过的格子会挡住其他路径。

栈里存的是 `Pos`（行、列、方向索引），出栈时按 `head` 一路取出来是反的，输出前要先倒序。路径长度算的是“步数”，节点数减一。

## 小结

双栈队列告诉你“结构可以组合出结构”，报数问题告诉你“队列天然适合轮流循环的场景”，迷宫则展示了栈在回溯搜索里的威力。这三个问题背后分别是摊还分析、循环队列语义和 DFS 回溯，都是数据结构课的常客。
