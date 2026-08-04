---
title: 第二幕：二叉排序树
icon: material-symbols:power-outline
order: 2
category:
  - 数据结构
tag:
  - C/C++
  - 树
  - 查找
---

## 序

折半查找快，但要求数组有序，插入删除又得挪元素。二叉排序树（BST）把“有序”这回事做成了树的结构：左子树都比根小，右子树都比根大。插入、删除、查找都沿着树往下走，平均 `O(log n)`。

## 创建与插入

```C
typedef struct BSTNode {
  int key;
  BSTNode *lchild;
  BSTNode *rchild;
} BSTNode;

bool insertBST(BSTNode *&p, int k) {
  if (p == NULL) {
    p = (BSTNode *)malloc(sizeof(BSTNode));
    p->key = k;
    p->lchild = p->rchild = NULL;
    return true;
  }
  if (k == p->key) return false;      // 重复关键字，插入失败
  if (k < p->key) return insertBST(p->lchild, k);
  return insertBST(p->rchild, k);
}

BSTNode *createBST(int a[], int n) {
  BSTNode *bt = NULL;
  for (int i = 0; i < n; i++) insertBST(bt, a[i]);
  return bt;
}
```

注意 `BSTNode *&p`（C++ 引用）：新建节点时要修改指针本身，传引用才能把新节点挂到父节点上。用纯 C 就得传二级指针。

实验用 `{4, 9, 0, 1, 8, 6, 3, 5, 2, 7}` 建树，括号表示法：

```
4(0(,1(,3(2))),9(8(6(5,7))))
```

括号表示的读法：`4` 的左子树是 `0(,1(,3(2)))`（0 没有左孩子，右孩子是 1，1 的右孩子是 3，3 的左孩子是 2），右子树是 `9(8(6(5,7)))`。

## 查找

递归版和非递归版本质一样，都是“比根小走左，比根大走右”：

```C
BSTNode *searchRecur(BSTNode *b, int key) {
  if (b == NULL || b->key == key) return b;
  printf("%d -> ", b->key);
  if (key < b->key) return searchRecur(b->lchild, key);
  return searchRecur(b->rchild, key);
}

BSTNode *searchNonRecur(BSTNode *b, int key) {
  while (b != NULL) {
    if (b->key == key) return b;
    printf("%d -> ", b->key);
    b = (key < b->key) ? b->lchild : b->rchild;
  }
  return NULL;
}
```

在上面那棵树里查 6，路径是 `4 -> 9 -> 8 -> 6`，共 4 步。因为 6 在 4 的右子树、9 的左子树、8 的左子树里，每一层都恰好砍掉一半分支。

## 复杂度与退化

平均情况下 BST 查找、插入都是 `O(log n)`，但这建立在树“长得均匀”的前提上。如果插入序列本身有序，比如 `{1, 2, 3, ..., n}`，树会退化成一条链，查找变成 `O(n)`，跟顺序查找没区别。

解法是让树自己保持平衡——AVL 树、红黑树就是干这个的。考试常考“什么序列会让 BST 退化成链”和“中序遍历 BST 一定有序”，这两个点记牢。

## 小结

BST 用树的结构实现了“动态数组里的折半查找”：插入删除不用挪元素，查找还很快。它也是后面 AVL、红黑树、B 树的起点。实验里递归和非递归都写一遍，能帮你把“树的递归结构”和“指针的迭代走法”两套思维打通。
