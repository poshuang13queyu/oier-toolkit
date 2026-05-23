import { ParseResult, GenOptions, GenResult, SubtaskConfig, StrategyConfig } from '../parser/types';
import { GenContext, randInt, resolveNum } from './genUtils';
import { resolveStrategies } from './strategies';

export type { GenOptions, GenResult, SubtaskConfig, StrategyConfig };

function mergeGroup(config: ParseResult, groupIndex: number): ParseResult {
  const group = config.constraintGroups[groupIndex];
  if (!group) return config;

  const merged: ParseResult = {
    ...config,
    variables: config.variables.map(v => {
      const override = group.variables.find(gv => gv.name === v.name);
      if (override) {
        return { ...v, min: override.min ?? v.min, max: override.max ?? v.max, maxVar: override.maxVar ?? v.maxVar };
      }
      return v;
    }),
    arrays: config.arrays.map(a => {
      const override = group.arrays.find(ga => ga.name === a.name);
      if (override) {
        return { ...a, elementMin: override.elementMin ?? a.elementMin, elementMax: override.elementMax ?? a.elementMax, elementMaxVar: override.elementMaxVar ?? a.elementMaxVar };
      }
      return a;
    }),
  };

  return merged;
}

/** 渲染 ctx 中的值为输出文本（shared by simple + subtask） */
function renderOutput(config: ParseResult, ctx: GenContext): string {
  const lines: string[] = [];

  const rowFieldNames = new Set<string>();
  for (const row of config.rows) {
    for (const f of row.fields) rowFieldNames.add(f.name);
  }

  const topVars = config.variables.filter(v => !rowFieldNames.has(v.name));
  const varLine = topVars.map(v => ctx.values[v.name]).join(' ');
  if (varLine) lines.push(varLine);

  for (const arr of config.arrays) {
    const rows = resolveNum(arr.length, ctx) ?? 0;
    const cols = arr.length2 ? (resolveNum(arr.length2, ctx) ?? 1) : 0;
    const elemMin = arr.elementMin ?? 0;
    let elemMax: number;
    if (arr.elementMaxVar && arr.elementMaxVar in ctx.values) {
      elemMax = ctx.values[arr.elementMaxVar];
    } else if (arr.elementMax !== undefined) {
      elemMax = arr.elementMax;
    } else {
      const rowsMax = resolveNum(arr.length, ctx);
      const colsMax = arr.length2 ? resolveNum(arr.length2, ctx) : undefined;
      if (rowsMax !== undefined && colsMax !== undefined) {
        elemMax = Math.max(rowsMax, colsMax, 1000);
      } else {
        elemMax = 1000000000;
      }
    }
    if (cols > 0) {
      for (let r = 0; r < rows; r++) {
        const row: number[] = [];
        for (let c = 0; c < cols; c++) row.push(randInt(elemMin, elemMax));
        lines.push(row.join(' '));
      }
    } else {
      const elems: number[] = [];
      for (let i = 0; i < rows; i++) elems.push(randInt(elemMin, elemMax));
      lines.push(elems.join(' '));
    }
  }

  for (const rowDef of config.rows) {
    const count = resolveNum(rowDef.repeat, ctx) ?? 0;
    for (let i = 0; i < count; i++) {
      const vals: number[] = [];
      for (const f of rowDef.fields) {
        const fullDef = config.variables.find(v => v.name === f.name);
        const min = fullDef?.min ?? f.min ?? 0;
        let max: number;
        if (fullDef?.maxVar && fullDef.maxVar in ctx.values) {
          max = ctx.values[fullDef.maxVar];
        } else if (fullDef?.max !== undefined) {
          max = fullDef.max;
        } else if (f.max !== undefined) {
          max = f.max;
        } else {
          max = 1000000000;
        }
        vals.push(randInt(min, max));
      }
      lines.push(vals.join(' '));
    }
  }

  return lines.join('\n');
}

/** 运行一组子任务 */
export function executeSubtask(config: ParseResult, subtask: SubtaskConfig): string[] {
  const cases: string[] = [];
  const strategies = resolveStrategies(subtask.strategies);

  for (let i = 0; i < subtask.testCount; i++) {
    const ctx: GenContext = { values: {} };

    for (const strategy of strategies) {
      strategy.apply(config, ctx);
    }

    cases.push(expandTestGroups(config, ctx));
  }

  return cases;
}

/** 主入口 */
export function generateData(config: ParseResult, options: GenOptions): GenResult {
  if (options.mode === 'subtask' && options.subtasks && options.subtasks.length > 0) {
    const allCases: string[] = [];
    for (const subtask of options.subtasks) {
      const subtaskCases = executeSubtask(config, subtask);
      allCases.push(...subtaskCases);
    }
    return { cases: allCases };
  }

  // simple mode (original logic)
  const activeConfig = options.groupIndex !== undefined ? mergeGroup(config, options.groupIndex) : config;
  const cases: string[] = [];

  for (let t = 0; t < options.count; t++) {
    const ctx: GenContext = { values: {} };

    const deferred: typeof activeConfig.variables = [];
    for (const v of activeConfig.variables) {
      if (v.min !== undefined && v.maxVar === undefined) {
        ctx.values[v.name] = randInt(v.min, v.max ?? 1000000000);
      } else {
        deferred.push(v);
      }
    }
    for (const v of deferred) {
      const min = v.min ?? 1;
      let max: number;
      if (v.maxVar && v.maxVar in ctx.values) {
        max = ctx.values[v.maxVar];
      } else if (v.max !== undefined) {
        max = v.max;
      } else {
        max = 1000000000;
      }
      ctx.values[v.name] = randInt(min, max);
    }

    cases.push(expandTestGroups(activeConfig, ctx));
  }

  return { cases };
}

/** 单次生成一组变量的值到 ctx */
function generateVars(config: ParseResult, ctx: GenContext): void {
  const deferred: typeof config.variables = [];
  for (const v of config.variables) {
    if (ctx.values[v.name] !== undefined) continue;
    if (v.min !== undefined && v.maxVar === undefined) {
      ctx.values[v.name] = randInt(v.min, v.max ?? 1000000000);
    } else {
      deferred.push(v);
    }
  }
  for (const v of deferred) {
    if (ctx.values[v.name] !== undefined) continue;
    const min = v.min ?? 1;
    let max: number;
    if (v.maxVar && v.maxVar in ctx.values) {
      max = ctx.values[v.maxVar];
    } else if (v.max !== undefined) {
      max = v.max;
    } else {
      max = 1000000000;
    }
    ctx.values[v.name] = randInt(min, max);
  }
}

/** 展开 T 组数据为完整文本 */
function expandTestGroups(config: ParseResult, ctx: GenContext): string {
  const tVar = config.testGroupVar;
  const t = tVar ? (ctx.values[tVar] ?? 1) : 1;

  if (!tVar || t <= 1) {
    return renderOutput(config, ctx);
  }

  // T 只在首行输出一次
  const lines: string[] = [String(t)];

  // 构建一个排除 T 的配置用于每组渲染
  const groupConfig: ParseResult = {
    ...config,
    variables: config.variables.filter(v => v.name !== tVar),
  };

  for (let g = 0; g < t; g++) {
    const groupCtx: GenContext = { values: {} };
    generateVars(config, groupCtx);
    // 覆盖 T 的值使其他依赖正确
    lines.push(renderOutput(groupConfig, groupCtx));
  }

  return lines.join('\n');
}
