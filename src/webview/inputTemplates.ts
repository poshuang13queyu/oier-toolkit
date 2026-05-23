export interface InputTemplate {
  name: string;
  description: string;
  text: string;
}

export const INPUT_TEMPLATES: InputTemplate[] = [
  {
    name: '数组 + 操作',
    description: '单变量 + 数组，最基础模板',
    text: `第一行一个正整数 N（1 ≤ N ≤ 10^5）。
第二行 N 个整数 a_i（1 ≤ a_i ≤ 10^9）。`,
  },
  {
    name: '图论 — 边集',
    description: 'N 点 M 边，无向图/有向图',
    text: `第一行两个整数 N, M，1 ≤ N ≤ 10^5，1 ≤ M ≤ 2×10^5。
接下来 M 行，每行两个整数 u, v，1 ≤ u, v ≤ N。`,
  },
  {
    name: '图论 — 带权边',
    description: 'N 点 M 边，每条边有权重',
    text: `第一行两个整数 N, M，1 ≤ N ≤ 50000，1 ≤ M ≤ 200000。
接下来 M 行，每行三个整数 u, v, w，1 ≤ u, v ≤ N，-10^3 ≤ w ≤ 10^3。`,
  },
  {
    name: '矩阵',
    description: 'N 行 M 列的矩阵',
    text: `第一行两个整数 N, M，1 ≤ N, M ≤ 1000。
接下来一个 N × M 的矩阵，元素 a_{i,j} ∈ [0, 10^9]。`,
  },
  {
    name: '百分比约束',
    description: '含百分比数据范围划分',
    text: `第一行一个正整数 N（1 ≤ N ≤ 10^5）。
第二行 N 个整数 a_i（1 ≤ a_i ≤ 10^9）。

对于 30% 的数据，N ≤ 1000。
对于 60% 的数据，N ≤ 50000。
对于 100% 的数据，N ≤ 10^5。`,
  },
  {
    name: 'T 组数据',
    description: '多组测试用例',
    text: `第一行一个整数 T，表示有 T 组测试数据（1 ≤ T ≤ 10）。
每组第一行两个整数 N, M（1 ≤ N ≤ 1000，1 ≤ M ≤ N）。
每组第二行 N 个整数 a_i（1 ≤ a_i ≤ 10^9）。`,
  },
  {
    name: '序列操作',
    description: 'N 个元素 + Q 次操作',
    text: `第一行两个整数 N, Q，1 ≤ N, Q ≤ 2×10^5。
第二行 N 个整数 a_i，1 ≤ a_i ≤ 10^9。
接下来 Q 行，每行三个整数 op, l, r，1 ≤ op ≤ 2，1 ≤ l ≤ r ≤ N。`,
  },
  {
    name: '树结构',
    description: 'N 个节点的树，N-1 条边',
    text: `第一行一个整数 N，1 ≤ N ≤ 10^5。
接下来 N-1 行，每行两个整数 u, v，表示 u 和 v 之间有一条边（1 ≤ u, v ≤ N）。`,
  },
  {
    name: '二维矩阵 — 含百分比',
    description: '矩阵 + 百分比数据范围',
    text: `第一行两个整数 N, M，1 ≤ N, M ≤ 1000。
接下来 N 行，每行 M 个整数 a_{i,j}（0 ≤ a_{i,j} ≤ 10^9）。

对于 20% 的数据，N, M ≤ 10。
对于 50% 的数据，N, M ≤ 100。
对于 100% 的数据，N, M ≤ 1000。`,
  },
];
