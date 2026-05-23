import { SubtaskTemplate } from '../parser/types';

export const PRESET_TEMPLATES: SubtaskTemplate[] = [
  {
    name: '基础百分比分布',
    subtasks: [
      { name: '10% 小数据', percentage: 10, testCount: 2, strategies: [{ type: 'scale', options: { scalePercent: 10 } }, { type: 'random' }] },
      { name: '30% 中数据', percentage: 30, testCount: 3, strategies: [{ type: 'scale', options: { scalePercent: 30 } }, { type: 'random' }] },
      { name: '60% 较大数据', percentage: 60, testCount: 3, strategies: [{ type: 'scale', options: { scalePercent: 60 } }, { type: 'random' }] },
      { name: '100% 全数据', percentage: 100, testCount: 2, strategies: [{ type: 'scale', options: { scalePercent: 100 } }, { type: 'random' }, { type: 'boundary', options: { mode: 'mixed' } }] },
    ],
  },
  {
    name: '边界强化分布',
    subtasks: [
      { name: '全最小值', percentage: 10, testCount: 2, strategies: [{ type: 'boundary', options: { mode: 'allMin' } }] },
      { name: '全最大值', percentage: 10, testCount: 2, strategies: [{ type: 'boundary', options: { mode: 'allMax' } }] },
      { name: '30% 小数据', percentage: 30, testCount: 3, strategies: [{ type: 'scale', options: { scalePercent: 30 } }, { type: 'random' }] },
      { name: '50% 全数据', percentage: 50, testCount: 3, strategies: [{ type: 'scale', options: { scalePercent: 100 } }, { type: 'random' }, { type: 'boundary', options: { mode: 'mixed' } }] },
    ],
  },
  {
    name: '极端测试分布',
    subtasks: [
      { name: '全最小值', percentage: 20, testCount: 2, strategies: [{ type: 'boundary', options: { mode: 'allMin' } }] },
      { name: '全最大值', percentage: 20, testCount: 2, strategies: [{ type: 'boundary', options: { mode: 'allMax' } }] },
      { name: '混合边界', percentage: 20, testCount: 2, strategies: [{ type: 'boundary', options: { mode: 'mixed' } }] },
      { name: '50% 中数据', percentage: 20, testCount: 2, strategies: [{ type: 'scale', options: { scalePercent: 50 } }, { type: 'random' }] },
      { name: '100% 随机', percentage: 20, testCount: 2, strategies: [{ type: 'scale', options: { scalePercent: 100 } }, { type: 'random' }] },
    ],
  },
];
