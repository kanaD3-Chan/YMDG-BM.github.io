---
title: 第二幕：哈夫曼树与编码
icon: material-symbols:power-outline
order: 2
category:
  - 数据结构
tag:
  - C/C++
  - 树
  - 哈夫曼
---

## 序

如果字符的出现频率不一样，给高频字符短编码、低频字符长编码，整段数据的长度就能压下来。哈夫曼树干的就是这件事：它是一棵带权路径长度（WPL）最小的二叉树，也是无损压缩（如 ZIP 里的 DEFLATE）的地基。

## 构造算法

给定 n 个带权叶子节点，反复执行：

1. 从森林里挑两个权值最小的节点；
2. 合并成一个新节点，权值等于两者之和；
3. 新节点放回森林。

直到森林只剩一棵树。每一步都是局部最优，最后得到全局最优——贪心的经典案例。

实验数据：8 个字符 `c i b u e d a r`，权值 `{7, 19, 2, 6, 32, 3, 21, 10}`。合并过程：

| 轮次 | 取出 | 合并结果 | 森林剩余权值 |
|------|------|----------|--------------|
| 1 | 2(b), 3(d) | 5 | 5, 6, 7, 10, 19, 21, 32 |
| 2 | 5, 6(u) | 11 | 7, 10, 11, 19, 21, 32 |
| 3 | 7(c), 10(r) | 17 | 11, 17, 19, 21, 32 |
| 4 | 11, 17 | 28 | 19, 21, 28, 32 |
| 5 | 19(i), 21(a) | 40 | 28, 32, 40 |
| 6 | 28, 32(e) | 60 | 40, 60 |
| 7 | 40, 60 | 100 | 100 |

规定左分支编码 `0`、右分支编码 `1`，从根到叶子的路径就是字符的编码：

| 字符 | 权值 | 哈夫曼编码 |
|------|------|------------|
| e | 32 | 11 |
| i | 19 | 00 |
| a | 21 | 01 |
| u | 6 | 1001 |
| b | 2 | 10000 |
| d | 3 | 10001 |
| c | 7 | 1010 |
| r | 10 | 1011 |

验证一下：没有任何一个编码是另一个编码的前缀（前缀码），所以解码时可以从左到右无歧义地切分。这正是哈夫曼编码能“边读边解”的原因。

## 代码实现

每次挑两个最小节点，最简单的办法就是排序后取前两个。数据量不大时，`qsort` 就够了：

```C
TreeNode *buildHuffmanTree(TreeNode *leaves[], int n) {
  TreeNode **forest = (TreeNode **)malloc(n * sizeof(TreeNode *));
  for (int i = 0; i < n; i++) forest[i] = leaves[i];
  int size = n;

  while (size > 1) {
    qsort(forest, size, sizeof(TreeNode *), compareNode);
    TreeNode *left = forest[0];
    TreeNode *right = forest[1];

    HuffmanData parentData = {'\0', getWeight(left) + getWeight(right)};
    TreeNode *parent = newTreeNode(&parentData, sizeof(HuffmanData));
    parent->left = left;
    parent->right = right;

    forest[0] = parent;
    for (int i = 2; i < size; i++) forest[i - 1] = forest[i];
    size--;
  }
  return forest[0];
}
```

生成编码同样是 DFS：到叶子就记录路径，左走写 `0`，右走写 `1`：

```C
void generateCodes(TreeNode *node, char *code, int depth,
                   char codes[256][256]) {
  if (node == NULL) return;
  char ch = getChar(node);
  if (node->left == NULL && node->right == NULL && ch != '\0') {
    code[depth] = '\0';
    strcpy(codes[(unsigned char)ch], code);
    return;
  }
  if (node->left) {
    code[depth] = '0';
    generateCodes(node->left, code, depth + 1, codes);
  }
  if (node->right) {
    code[depth] = '1';
    generateCodes(node->right, code, depth + 1, codes);
  }
}
```

`codes` 用字符的 ASCII 值当下标，最后按 `chars[]` 顺序打印即可。

## 小结

哈夫曼编码的核心思想一句话：**高频短码、低频长码、前缀无歧义**。考试常考两件事：给权值画哈夫曼树、给树写编码。画树的时候注意合并顺序要从小到大，编码时注意左右分支的 `0/1` 约定要和题目一致——有些教材左 `1` 右 `0`，别想当然。
