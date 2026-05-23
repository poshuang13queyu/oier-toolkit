import { ParseResult } from './types';

/**
 * 规范格式解析器（B部分）
 * 
 * 支持的格式：
 * 1. 独立变量: 1 ≤ N ≤ 200
 * 2. 并列变量: 1 ≤ A, B ≤ N（上限可以是变量名）
 * 3. 数组声明: 第二行为 N 个非负整数，表示 K_i（0 ≤ K_i ≤ N）
 * 4. 数组声明: 接下来 N 行，每行一个整数 a_i ∈ [1, 10^9]
 * 5. 系数科学计数法: 2×10^5, -10^9（预处理中自动求值）
 * 6. 无不等式变量声明: 第一行两个整数 N, M
 * 7. 元组/边集输入: 接下来 M 行，每行三个整数 u, v, w
 * 8. 二维数组/矩阵: 一个 N × M 的矩阵
 */
export function parseNaturalLanguage(input: string): ParseResult {
  console.log('[Parser] ====== 开始解析 ======');
  console.log('[Parser] 原始输入:', input);

  const result: ParseResult = {
    variables: [],
    arrays: [],
    rows: [],
    constraintGroups: [],
    errors: [],
    raw: input,
  };

  if (!input.trim()) {
    console.log('[Parser] 输入为空，跳过');
    result.errors.push('输入为空，请粘贴输入格式描述');
    return result;
  }

  // 自动检测 JSON 包裹的输入（用户可能复制了之前解析结果的 JSON）
  if (input.trim().startsWith('{') && input.includes('"raw"')) {
    try {
      const parsed = JSON.parse(input);
      if (parsed.raw && typeof parsed.raw === 'string') {
        console.log('[Parser] 检测到 JSON 包裹输入，提取 raw 字段');
        input = parsed.raw;
      }
    } catch {
      // 不是合法 JSON，继续使用原始输入
    }
  }

  // ---- 预处理 ----
  let text = input
    .replace(/[\n\r]+/g, ' ')       // 换行 → 空格
    .replace(/\s+/g, ' ')           // 合并多余空格
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/，/g, ',')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/：/g, ':')
    .replace(/×/g, '*')
    .replace(/−/g, '-')
    .replace(/·/g, '*')
    .replace(/两/g, '二')           // "两个" → "二个" → 便于统一处理
    .replace(/[一二三四五六七八九]个/g, (match) => {
      const map: Record<string, string> = { '一': '1', '二': '2', '三': '3', '四': '4', '五': '5', '六': '6', '七': '7', '八': '8', '九': '9' };
      return map[match[0]] + '个';
    })
    .trim();

  // 求值科学计数法: 2*10^5 → 200000, -10^9 → -1000000000
  text = text.replace(/(-?\d+)\s*\*\s*10\^(\d+)/g, (_, coeff, exp) => {
    return String(parseInt(coeff) * Math.pow(10, parseInt(exp)));
  });
  text = text.replace(/(\d+)\^(\d+)\b(?!\s*\()/g, (_, base, exp) => {
    return String(Math.pow(parseInt(base), parseInt(exp)));
  });
  console.log('[Parser] 预处理后文本:', text);

  // ==========================================
  // 第一步：提取数组声明（先处理，避免干扰）
  // ==========================================

  // 模式1: X 个 ... 整数 ... [表示,] Y_i (范围)
  // 例: N 个非负整数，表示 K_i（0 ≤ K_i ≤ N）
  // 例: N 个用空格隔开的非负整数，表示 K_i
  // 例: q 个正整数， x_i
  // 例: N 个整数 a_i
  const arrayPattern1 = /([a-zA-Z_][a-zA-Z0-9_]*)\s*个[\s\S]*?(?:整数|正整数)[\s\S]*?(?:表示|[,，]|\s+)([a-zA-Z_][a-zA-Z0-9_]*)_i/g;
  let match;
  while ((match = arrayPattern1.exec(text)) !== null) {
    const lengthVar = match[1];
    const arrName = match[2];

    let elemMin: number | undefined;
    let elemMax: number | undefined;
    let elemMaxVar: string | undefined;
    const afterPos = match.index + match[0].length;
    const afterText = text.substring(afterPos);

    // 匹配 (0 ≤ K_i ≤ N) 或 (0 <= K_i <= N)
    const rangeMatch = afterText.match(/^\s*[\(（]\s*(\d+)\s*(?:<=|<)\s*\w+_i\s*(?:<=|<)\s*(\w+)\s*[\)）]/);
    if (rangeMatch) {
      elemMin = parseInt(rangeMatch[1], 10);
      const maxStr = rangeMatch[2];
      const parsed = parseNumber(maxStr);
      if (!isNaN(parsed)) {
        elemMax = parsed;
      } else {
        elemMaxVar = maxStr;
      }
    }

    result.arrays.push({
      name: arrName,
      length: lengthVar,
      elementType: 'int',
      elementMin: elemMin ?? 0,
      elementMax: elemMax,
      elementMaxVar: elemMaxVar,
    });
  }
  console.log('[Parser] 第一步（一维数组）结果:', JSON.stringify(result.arrays));

  // 模式2: 接下来 N 行，每行... X_i ∈ [min, max]
  // 例: 接下来 n 行，每行一个整数 a_i ∈ [1, 10^9]
  // 例: 接下来 N 行，每行一个整数 a_i ∈ [0, N]
  const arrayPattern2 = /接下来\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*行[\s\S]*?([a-zA-Z_][a-zA-Z0-9_]*)_i\s*∈\s*[\[\(]([^,]+),\s*([^\]\)]+)[\]\)]/g;
  console.log('[Parser] arrayPattern2 匹配数:', text.match(/接下来/g)?.length ?? 0);
  while ((match = arrayPattern2.exec(text)) !== null) {
    const lengthVar = match[1];
    const arrName = match[2];
    const elemMinRaw = match[3].trim();
    const elemMaxRaw = match[4].trim();
    const elemMin = parseNumber(elemMinRaw);
    const elemMax = parseNumber(elemMaxRaw);

    if (!result.arrays.some(a => a.name === arrName)) {
      result.arrays.push({
        name: arrName,
        length: lengthVar,
        elementType: 'int',
        elementMin: isNaN(elemMin) ? 0 : elemMin,
        elementMax: isNaN(elemMax) ? undefined : elemMax,
        elementMaxVar: isNaN(elemMax) ? elemMaxRaw : undefined,
      });
    }
  }
  console.log('[Parser] 第一步结束（共', result.arrays.length, '个数组）');

  // ==========================================
  // 第二步：二维数组/矩阵声明
  // ==========================================

  // 模式: [rows] * [cols] 的矩阵
  // 例: 一个 N × M 的矩阵 / N 行 M 列的矩阵
  const matrixPattern = /([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\s*行\s*|\s*[×*]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:列\s*)?的\s*矩阵/g;
  while ((match = matrixPattern.exec(text)) !== null) {
    const rows = match[1];
    const cols = match[2];
    const name = 'a';
    if (!result.arrays.some(a => a.name === name && a.length2 !== undefined)) {
      result.arrays.push({
        name,
        length: rows,
        length2: cols,
        elementType: 'int',
      });
    }
  }
  console.log('[Parser] 第二步（二维数组）结果:', JSON.stringify(result.arrays));

  // 模式: 接下来 [rows] 行，每行 [cols] 个整数（无 _i 命名，视为二维数组）
  // 例: 接下来 N 行，每行 M 个整数
  const array2DPattern = /接下来\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*行[\s\S]*?每行\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*个\s*(?:非负)?整数(?![\s\S]*?_[ij]|\s*∈)/g;
  while ((match = array2DPattern.exec(text)) !== null) {
    const rows = match[1];
    const cols = match[2];
    const name = 'a';
    if (!result.arrays.some(a => a.name === name && a.length === rows && a.length2 === cols)) {
      result.arrays.push({
        name,
        length: rows,
        length2: cols,
        elementType: 'int',
      });
    }
  }
  console.log('[Parser] 第二步结束（共', result.arrays.length, '个数组）');

  // ==========================================
  // 第三步：元组/边集输入
  // ==========================================

  // 模式: 接下来 [repeat] 行，每行 [count] 个整数 [f1], [f2], ...
  // 例: 接下来 M 行，每行三个整数 u, v, w
  const rowPattern = /接下来\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*行[\s\S]*?每行\s*(\d+)\s*个\s*(?:非负)?整数\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
  console.log('[Parser] 第三步（元组）开始, 全文:', text);
  while ((match = rowPattern.exec(text)) !== null) {
    console.log('[Parser] 元组匹配成功: repeat=', match[1], 'fields=', match[3]);
    const repeat = match[1];
    const fieldNames = match[3].split(',').map(s => s.trim()).filter(name => !name.endsWith('_i'));
    if (fieldNames.length > 0 && !result.rows.some(r => r.repeat === repeat)) {
      result.rows.push({
        repeat,
        fields: fieldNames.map(name => ({
          name,
          type: 'int' as const,
          nullable: false,
        })),
      });
    }
  }
  console.log('[Parser] 第三步结果:', JSON.stringify(result.rows));

  // ==========================================
  // 第四步：无不等式的变量声明
  // ==========================================

  // 模式: 第[一二三四五六七八九十]{1,2}行 [包含] [count] 个[正整数|整数] var1, var2, ...
  // 例: 第一行两个整数 N, M
  // 例: 第二行包含三个正整数 n, m, k
  const lineOrderPattern = /第\s*(?:[一二三四五六七八九十]+|\d+)\s*行\s*(?:包含)?\s*(\d+)\s*个\s*(?:正)?整数\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
  console.log('[Parser] 第四步（无不等式变量）lineOrderPattern');
  while ((match = lineOrderPattern.exec(text)) !== null) {
    console.log('[Parser] 行序匹配: names=', match[2]);
    const varNames = match[2].split(',').map(s => s.trim()).filter(name => !name.endsWith('_i'));
    for (const name of varNames) {
      if (!result.variables.some(v => v.name === name)) {
        result.variables.push({
          name,
          type: 'int',
          nullable: false,
        });
      }
    }
  }

  // 模式: [包含] [count] 个[正整数|整数] var1, var2, ...（开头，无 ≤）
  // 例: 给定两个整数 N 和 M
  const plainVarPattern = /(?:^|[:：.\s])(?:给定|输入|有|包含)?\s*(\d+)\s*个\s*(?:正)?整数\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*和\s*[a-zA-Z_][a-zA-Z0-9_]*)*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*(?:\s*和\s*[a-zA-Z_][a-zA-Z0-9_]*))*)/g;
  console.log('[Parser] 第四步 plainVarPattern');
  while ((match = plainVarPattern.exec(text)) !== null) {
    console.log('[Parser] 纯声明匹配: raw=', match[2]);
    const raw = match[2].replace(/\s*和\s*/g, ', ');
    const varNames = raw.split(',').map(s => s.trim()).filter(name => !name.endsWith('_i'));
    for (const name of varNames) {
      if (!result.variables.some(v => v.name === name)) {
        result.variables.push({
          name,
          type: 'int',
          nullable: false,
        });
      }
    }
  }
  console.log('[Parser] 第四步结果: 变量列表=', JSON.stringify(result.variables));

  // ==========================================
  // 第四步半：T 组数据检测
  // ==========================================
  const tGroupPattern = /([a-zA-Z_][a-zA-Z0-9_]*)\s*组\s*(?:测试)?数据/g;
  let tMatch: RegExpExecArray | null;
  while ((tMatch = tGroupPattern.exec(text)) !== null) {
    const tVar = tMatch[1];
    if (result.variables.some(v => v.name === tVar)) {
      result.testGroupVar = tVar;
      console.log('[Parser] T 组数据检测: testGroupVar=', tVar);
    }
  }

  // ==========================================
  // 第五步：提取独立变量（不等式模式）
  // ==========================================

  // 模式1: min <= var1, var2 <= max（并列变量，先处理避免被单变量误匹配）
  const multiVarPattern = /(-?\d+)\s*(<=|<)\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s*(<=|<)\s*(-?\w+)/g;
  console.log('[Parser] 第五步（不等式变量）multiVarPattern');
  while ((match = multiVarPattern.exec(text)) !== null) {
    console.log('[Parser] multiVar匹配: min=', match[1], 'vars=', match[3], 'max=', match[5]);
    const min = parseInt(match[1], 10);
    const maxStr = match[5];
    const max = parseNumber(maxStr);
    const maxVar = isNaN(max) ? maxStr : undefined;
    const varNames = match[3].split(',').map(s => s.trim()).filter(name => !name.endsWith('_i'));

    for (const name of varNames) {
      const existing = result.variables.find(v => v.name === name);
      if (existing) {
        if (existing.min === undefined) existing.min = min;
        if (existing.max === undefined && maxVar === undefined && !isNaN(max)) existing.max = max;
        if (existing.maxVar === undefined && maxVar !== undefined) existing.maxVar = maxVar;
      } else {
        result.variables.push({
          name,
          type: 'int',
          min,
          max: !isNaN(max) ? max : undefined,
          maxVar: maxVar,
          nullable: false,
        });
      }
    }
  }

  // 模式2: min <= var <= max（单变量完整范围）
  const singleVarPattern = /(-?\d+)\s*(<=|<)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(<=|<)\s*(-?\d+)/g;
  console.log('[Parser] 第五步 singleVarPattern');
  while ((match = singleVarPattern.exec(text)) !== null) {
    const name = match[3];
    console.log('[Parser] singleVar匹配: min=', match[1], 'var=', name, 'max=', match[5]);
    if (name.endsWith('_i')) continue;
    const existing = result.variables.find(v => v.name === name);
    if (existing) {
      if (existing.min === undefined) existing.min = parseInt(match[1], 10);
      if (existing.max === undefined) existing.max = parseInt(match[5], 10);
    } else {
      result.variables.push({
        name,
        type: 'int',
        min: parseInt(match[1], 10),
        max: parseInt(match[5], 10),
        nullable: false,
      });
    }
  }
  console.log('[Parser] 第五步结束: 变量列表=', JSON.stringify(result.variables));

  // ==========================================
  // 第六步：百分比约束分组解析
  // ==========================================
  console.log('[Parser] 第六步（百分比约束分组）');
  const pctPattern = /对于\s*(\d+)%\s*的数据[\s,，：:]*([\s\S]*?)(?=对于\s*\d+%\s*的数据|$)/g;
  let pctMatch: RegExpExecArray | null;
  while ((pctMatch = pctPattern.exec(input)) !== null) {
    const label = pctMatch[1] + '%';
    const constraintText = pctMatch[2]
      .replace(/[\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/≤/g, '<=')
      .replace(/≥/g, '>=')
      .replace(/，/g, ',')
      .replace(/×/g, '*')
      .replace(/−/g, '-')
      .replace(/(-?\d+)\s*\*\s*10\^(\d+)/g, (_, c, e) => String(parseInt(c) * Math.pow(10, parseInt(e))))
      .replace(/(\d+)\^(\d+)\b(?!\s*\()/g, (_, b, e) => String(Math.pow(parseInt(b), parseInt(e))))
      .trim();

    console.log('[Parser] 找到分组:', label, '约束:', constraintText);

    const groupVars: typeof result.variables = [];
    const groupArrays: typeof result.arrays = [];

    // 在同约束文本中提取变量和数组约束
    const groupMultiVarPattern = /(\d+)\s*(<=|<)\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s*(<=|<)\s*(\w+)/g;
    let gMatch: RegExpExecArray | null;
    while ((gMatch = groupMultiVarPattern.exec(constraintText)) !== null) {
      const min = parseInt(gMatch[1], 10);
      const maxStr = gMatch[5];
      const max = parseNumber(maxStr);
      const maxVar = isNaN(max) ? maxStr : undefined;
      const varNames = gMatch[3].split(',').map(s => s.trim()).filter(name => !name.endsWith('_i'));

      for (const name of varNames) {
        groupVars.push({
          name,
          type: 'int',
          min,
          max: !isNaN(max) ? max : undefined,
          maxVar: maxVar,
          nullable: false,
        });
      }
    }

    // 数组元素约束: 1 ≤ x_i ≤ q
    const groupArrayPattern = /(\d+)\s*(<=|<)\s*([a-zA-Z_][a-zA-Z0-9_]*)_i\s*(<=|<)\s*(\w+)/g;
    while ((gMatch = groupArrayPattern.exec(constraintText)) !== null) {
      const arrName = gMatch[3];
      const elemMin = parseInt(gMatch[1], 10);
      const maxStr = gMatch[5];
      const elemMax = parseNumber(maxStr);
      const elemMaxVar = isNaN(elemMax) ? maxStr : undefined;

      if (!groupArrays.some(a => a.name === arrName)) {
        groupArrays.push({
          name: arrName,
          length: '',
          elementType: 'int',
          elementMin: elemMin,
          elementMax: isNaN(elemMax) ? undefined : elemMax,
          elementMaxVar: elemMaxVar,
        });
      }
    }

    if (groupVars.length > 0 || groupArrays.length > 0) {
      result.constraintGroups.push({ label, variables: groupVars, arrays: groupArrays });
    }
  }
  console.log('[Parser] 百分比分组结果:', JSON.stringify(result.constraintGroups));

  // ==========================================
  // 第七步：结果检查
  // ==========================================
  if (result.variables.length === 0 && result.arrays.length === 0 && result.rows.length === 0 && result.constraintGroups.length === 0) {
    console.log('[Parser] 未识别到任何定义');
    result.errors.push(
      '未识别到变量、数组或行定义。\n' +
      '支持的格式:\n' +
      '  · 1 ≤ N ≤ 200\n' +
      '  · 1 ≤ A, B ≤ N\n' +
      '  · 第一行两个整数 N, M\n' +
      '  · N 个整数，表示 K_i（0 ≤ K_i ≤ N）\n' +
      '  · 接下来 N 行，每行一个整数 a_i ∈ [1, 10^9]\n' +
      '  · 接下来 M 行，每行三个整数 u, v, w\n' +
      '  · 一个 N × M 的矩阵'
    );
  }

  console.log('[Parser] ====== 解析完成 ======');
  console.log('[Parser] 最终结果:', JSON.stringify(result, null, 2));
  return result;
}

/** 解析数字，支持 10^5 格式，返回 NaN 表示是变量名 */
function parseNumber(str: string): number {
  str = str.trim();
  const expMatch = str.match(/^(-?\d+)\^(\d+)$/);
  if (expMatch) {
    return Math.pow(parseInt(expMatch[1], 10), parseInt(expMatch[2], 10));
  }
  if (/^-?\d+$/.test(str)) {
    return parseInt(str, 10);
  }
  return NaN;  // 变量名，如 "N"
}