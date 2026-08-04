---
title: 第一幕：二叉树
icon: material-symbols:power-outline
order: 1
category:
  - 数据结构
tag:
  - C/C++
  - 树
  - 二叉树
---

## 序

链表把节点串成一串，二叉树则是每个节点最多分两个叉。别小看这个“最多两个”的限制，它让一切操作都有了确定的递归结构：左子树、右子树、根，三件事反复套娃，就组成了树上的几乎所有算法。

这一幕用二叉链表实现一棵二叉树，从括号表示法建树开始，到输出、找节点、算高度、四种遍历、释放内存，全部过一遍。

## 二叉链表存储结构

```C
typedef struct TreeNode {
  void *val;                    // 泛型：先存 char，后面哈夫曼存权值结构体
  struct TreeNode *left;
  struct TreeNode *right;
} TreeNode;
```

这里用 `void *val` 是为了让同一棵树既能存字符又能存哈夫曼节点，代价是每次取值都要手动转换类型。如果只做二叉树实验，直接 `char val` 更省心。

## 括号表示法建树

括号表示法长这样：

```
A(B(D,E(H(J,K(L,M(,N))))),C(F,G(,I)))
```

规则：节点值后面跟 `(` 就说明有孩子，左子树结束遇 `,` 开始右子树，遇 `)` 返回上一层。递归解析：

```C
TreeNode *buildTree(const char **str) {
  if (**str == '\0' || **str == ')' || **str == ',')
    return NULL;

  char val = **str;
  (*str)++;
  TreeNode *node = newTreeNode(&val, sizeof(char));

  if (**str == '(') {
    (*str)++;
    node->left = buildTree(str);
    if (**str == ',') {
      (*str)++;
      node->right = buildTree(str);
    }
    if (**str == ')') (*str)++;
  }
  return node;
}
```

注意 `const char **str`：递归每层都要推进同一个指针，所以传指针的指针。最容易写错的地方是逗号和括号的匹配，建议拿纸把 `A(B,C)` 和 `A(B(,D),C)` 手动模拟一遍再写代码。

## 输出、查找、高度、释放

输出和建树是逆过程，同样递归：

```C
void printTree(TreeNode *tree) {
  if (tree == NULL) return;
  printf("%c", *(char *)tree->val);
  if (tree->left != NULL || tree->right != NULL) {
    printf("(");
    printTree(tree->left);
    if (tree->right != NULL) printf(",");
    printTree(tree->right);
    printf(")");
  }
}
```

查找用先序思路，先看根、再看左、再看右：

```C
TreeNode *findNode(TreeNode *tree, char c) {
  if (tree == NULL) return NULL;
  if (*(char *)tree->val == c) return tree;
  TreeNode *p = findNode(tree->left, c);
  if (p != NULL) return p;
  return findNode(tree->right, c);
}
```

高度是左右子树高度的最大值加一：

```C
int treeHeight(TreeNode *tree) {
  if (tree == NULL) return 0;
  int lh = treeHeight(tree->left);
  int rh = treeHeight(tree->right);
  return (lh > rh ? lh : rh) + 1;
}
```

释放必须用后序：先释放左右子树，再释放根。先 free 根就找不到子树了。

```C
void dropTree(TreeNode **tree) {
  if (*tree == NULL) return;
  dropTree(&((*tree)->left));
  dropTree(&((*tree)->right));
  free((*tree)->val);
  free(*tree);
  *tree = NULL;
}
```

## 四种遍历

先序（根左右）、中序（左根右）、后序（左右根）三个递归版本只差一行代码的位置：

```C
void preorder(TreeNode *tree) {
  if (tree == NULL) return;
  printf("%c ", *(char *)tree->val);
  preorder(tree->left);
  preorder(tree->right);
}

void inorder(TreeNode *tree) {
  if (tree == NULL) return;
  inorder(tree->left);
  printf("%c ", *(char *)tree->val);
  inorder(tree->right);
}

void postorder(TreeNode *tree) {
  if (tree == NULL) return;
  postorder(tree->left);
  postorder(tree->right);
  printf("%c ", *(char *)tree->val);
}
```

层次遍历是 BFS，得靠队列：根先入队，出队时把左右孩子依次入队。

```C
void levelorder(TreeNode *tree) {
  if (tree == NULL) return;
  // 用数组模拟队列，假设容量足够
  TreeNode *queue[128];
  int front = 0, rear = 0;
  queue[rear++] = tree;
  while (front < rear) {
    TreeNode *p = queue[front++];
    printf("%c ", *(char *)p->val);
    if (p->left)  queue[rear++] = p->left;
    if (p->right) queue[rear++] = p->right;
  }
}
```

实验题给的是 `A(B(D,E(H(J,K(L,M(,N))))),C(F,G(,I)))`，建树后输出 H 的左右孩子（J 和 K）。最长的一条链是 A→B→E→H→K→M→N，高度是 7。先序是 `ABDEHJKLMNCFGI`，中序是 `DBJHLKMNEAFCGI`，层次遍历是 `ABCDEFGHIJKLMN`——自己跑一遍对答案，比背结论实在。

::: note
先序 + 中序可以唯一确定一棵二叉树，先序 + 后序不行。这是树的经典考点，实验中建树用的括号表示法其实就是在给你“带结构的先序”。
:::

## 小结

二叉树的操作几乎全是递归，递归的写法就是“相信子问题已经解决”：建树相信左右子树建好了，遍历相信左右子树遍历好了，高度相信左右子树高度算好了。把递归的信任感建立起来，树这一章就通了一半。
