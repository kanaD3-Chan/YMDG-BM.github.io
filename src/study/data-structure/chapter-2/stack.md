---
title: 第一幕：栈
icon: material-symbols:power-outline
order: 1
category:
  - 数据结构
tag:
  - C/C++
  - 栈
---

栈是一种先入后出的数据结构，在各种情境中广泛应用，如底层实现的硬件栈用来进行函数参数传递、临时存储变量以及作为栈式虚拟机的核心组成部分。

栈可以由前面线性表来实现。本文我们使用链表来实现栈，以便实现快速的扩充与删除。

首先定义栈的基本数据类型。

```C
typedef struct Node {
  void *data;
  struct Node *next;
} Node;

typedef struct Stack {
  Node *head;
  size_t len;
} Stack;
```

与链表类似，我们也用一个节点来连接前后节点，然后用一个`Stack`类型来封装节点。

之后是栈的基本操作函数。
```C
Stack *create_stack();
bool push(Stack *stack, void *data, size_t size);
bool pop(Stack *stack, void *data, size_t size);
void *peek(Stack *stack, size_t size);
bool is_empty(Stack *stack);
void show_stack(Stack *stack, void (*print_func)(void *));
void drop_stack(Stack *stack, size_t size);
```

为了便于后续扩展，这里我们的栈使用`void *`类型来实现泛型，所以几乎所有的操作函数都要传入一个类型大小`size`参数。

具体实现：
```C
Stack *create_stack() {
  Stack *stack = (Stack *)malloc(sizeof(Stack));
  if (stack == NULL)
    return NULL;

  stack->head = NULL;
  stack->len = 0;
  return stack;
}

bool push(Stack *stack, void *data, size_t size) {
  if (stack == NULL)
    return false;

  Node *elem = (Node *)malloc(sizeof(Node));
  if (elem == NULL)
    return false;

  elem->next = stack->head;
  elem->data = malloc(size);
  memcpy(elem->data, data, size);
  stack->head = elem;
  stack->len++;
  return true;
}

bool pop(Stack *stack, void *data, size_t size) {
  if (stack == NULL || stack->len <= 0 || stack->head == NULL)
    return false;
  Node *tmp = stack->head;
  memcpy(data, stack->head->data, size);
  stack->head = tmp->next;
  stack->len--;
  free(tmp->data);
  free(tmp);
  return true;
}

void *peek(Stack *stack, size_t size) {
  if (stack == NULL || stack->head == NULL)
    return NULL;
  return stack->head->data;
}

bool is_empty(Stack *stack) {
  return stack == NULL || stack->len == 0 || stack->head == NULL;
}

void show_stack(Stack *stack, void (*print_func)(void *)) {
  if (stack == NULL || stack->head == NULL)
    return;

  unsigned int i = 0;
  Node *tmp = stack->head;
  while (tmp != NULL) {
    print_func(tmp->data);
    tmp = tmp->next;
    i++;
  }
}

void drop_stack(Stack *stack, size_t size) {
  if (stack == NULL)
    return;
  while (stack->head != NULL) {
    char _;
    pop(stack, &_, size);
  }
  free(stack);
}
```

栈可用于求解迷宫问题，主要用到DFS算法。

```C
void dfs_find_paths(int start_r, int start_c, int end_r, int end_c) {
  Stack *s = create_stack();
  Pos start = {start_r, start_c, 0};
  push(s, &start, sizeof(Pos));

  int visited[ROWS][COLS] = {0};
  visited[start_r][start_c] = 1;

  int dr[] = {0, 1, 0, -1};
  int dc[] = {1, 0, -1, 0};

  printf("============ 所有可达路径 ============\n");

  while (!is_empty(s)) {
    Pos *top = (Pos *)peek(s, sizeof(Pos));

    if (top->r == end_r && top->c == end_c) {
      path_count++;
      int len = s->len;

      Pos *current_path = (Pos *)malloc(len * sizeof(Pos));
      Node *curr = s->head;
      for (int i = len - 1; i >= 0; i--) {
        current_path[i] = *(Pos *)(curr->data);
        curr = curr->next;
      }

      printf("第 %d 条路径 (经过节点数: %d): ", path_count, len);
      print_path(current_path, len);

      if (len < min_len) {
        min_len = len;
        for (int i = 0; i < len; i++) {
          shortest_path[i] = current_path[i];
        }
      }
      free(current_path);

      Pos temp;
      pop(s, &temp, sizeof(Pos));
      visited[temp.r][temp.c] = 0;
    } else {
      if (top->di < 4) {
        int d = top->di;
        top->di++;

        int nr = top->r + dr[d];
        int nc = top->c + dc[d];

        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS &&
            maze[nr][nc] != '#' && !visited[nr][nc]) {

          Pos next_node = {nr, nc, 0};
          push(s, &next_node, sizeof(Pos));
          visited[nr][nc] = 1;
        }
      } else {
        Pos temp;
        pop(s, &temp, sizeof(Pos));
        visited[temp.r][temp.c] = 0;
      }
    }
  }

  drop_stack(s, sizeof(Pos));
}

```