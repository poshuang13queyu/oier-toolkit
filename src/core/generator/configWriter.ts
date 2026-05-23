import { ParseResult, SubtaskConfig } from '../parser/types';

export function generateConfigYml(
  parsedConfig: ParseResult,
  subtasks: SubtaskConfig[],
  groupIndex?: number
): string {
  const lines: string[] = [];

  let testIdx = 1;
  for (let si = 0; si < subtasks.length; si++) {
    const st = subtasks[si];
    const shortName = st.name.replace(/\s+/g, '').toLowerCase();

    lines.push(`- subtaskId: ${si + 1}`);
    lines.push(`  score: ${st.percentage}`);
    lines.push(`  testcases:`);

    for (let ti = 0; ti < st.testCount; ti++, testIdx++) {
      const path = `testcases/${shortName}/test${testIdx}.in`;
      lines.push(`    - input: ${path}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

export function generateReadmeContent(
  parsedConfig: ParseResult,
  subtasks: SubtaskConfig[]
): string {
  const lines: string[] = [];
  lines.push('# 测试数据说明');
  lines.push('');
  lines.push(`## 题目描述`);
  lines.push('');
  lines.push(`\`\`\``);
  lines.push(parsedConfig.raw);
  lines.push(`\`\`\``);
  lines.push('');
  lines.push(`## 数据分布`);
  lines.push('');
  lines.push('| 文件名 | 子任务 | 策略 | 数据范围 |');
  lines.push('|--------|--------|------|----------|');

  const strategyNames: Record<string, string> = {
    scale: '规模缩放',
    boundary: '边界值',
    random: '随机生成',
    special: '特殊性质',
  };

  for (const st of subtasks) {
    const strategyDesc = st.strategies
      .map(s => {
        const name = strategyNames[s.type] || s.type;
        if (s.options) {
          const opts = Object.entries(s.options)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ');
          return `${name}(${opts})`;
        }
        return name;
      })
      .join(' + ');

    const vars = parsedConfig.variables
      .map(v => {
        const range = [v.min ?? '-', v.maxVar ?? v.max ?? 'max']
          .join('..');
        return `${v.name}[${range}]`;
      })
      .join(', ');

    lines.push(`| ${st.name}(${st.testCount}组) | ${(st.percentage || '?') + '%'} | ${strategyDesc} | ${vars} |`);
  }

  lines.push('');
  return lines.join('\n');
}
