export interface VariableDef {
  name: string;
  type: 'int' | 'float' | 'string';
  min?: number;
  max?: number;
  maxVar?: string;
  nullable: boolean;
}

export interface ArrayDef {
  name: string;
  length: string;
  length2?: string;
  elementType: 'int' | 'float' | 'string';
  elementMin?: number;
  elementMax?: number;
  elementMaxVar?: string;
}

export interface RowDef {
  repeat: string;
  fields: VariableDef[];
}

export interface ConstraintGroup {
  label: string;
  variables: VariableDef[];
  arrays: ArrayDef[];
}

// ---- 策略驱动子任务系统 ----

export type StrategyType = 'scale' | 'boundary' | 'random' | 'special';

export interface StrategyConfig {
  type: StrategyType;
  options?: Record<string, any>;
}

export interface SubtaskConfig {
  name: string;
  percentage: number;
  testCount: number;
  strategies: StrategyConfig[];
}

export interface SubtaskTemplate {
  name: string;
  subtasks: SubtaskConfig[];
}

export type GenMode = 'simple' | 'subtask';

export interface GenOptions {
  mode: GenMode;
  count: number;
  subtasks?: SubtaskConfig[];
  groupIndex?: number;
}

export interface GenResult {
  cases: string[];
}

// ---- 解析结果 ----

export interface ParseResult {
  variables: VariableDef[];
  arrays: ArrayDef[];
  rows: RowDef[];
  constraintGroups: ConstraintGroup[];
  testGroupVar?: string;
  errors: string[];
  raw: string;
}
