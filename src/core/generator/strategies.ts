import { ParseResult, VariableDef, StrategyConfig } from '../parser/types';
import { GenContext, randInt } from './genUtils';

export interface Strategy {
  name: string;
  options?: Record<string, any>;
  apply(config: ParseResult, ctx: GenContext): void;
}

export class ScaleStrategy implements Strategy {
  name = 'scale';
  options?: Record<string, any>;

  constructor(options?: Record<string, any>) { this.options = options; }

  apply(config: ParseResult, ctx: GenContext): void {
    const factor = (this.options?.scalePercent ?? 100) / 100;

    for (const v of config.variables) {
      const min = v.min ?? 1;
      const max = v.max ?? 1000000000;
      const range = max - min;
      const newMax = Math.max(min, min + Math.floor(range * factor));
      ctx.values[v.name] = randInt(min, newMax);
    }
  }
}

export class BoundaryValueStrategy implements Strategy {
  name = 'boundary';
  options?: Record<string, any>;

  constructor(options?: Record<string, any>) { this.options = options; }

  apply(config: ParseResult, ctx: GenContext): void {
    const mode: 'allMin' | 'allMax' | 'mixed' = this.options?.mode ?? 'allMin';

    for (const v of config.variables) {
      const min = v.min ?? 1;
      let max: number;
      if (v.maxVar && v.maxVar in ctx.values) {
        max = ctx.values[v.maxVar];
      } else {
        max = v.max ?? 1000000000;
      }

      if (mode === 'allMin') {
        ctx.values[v.name] = min;
      } else if (mode === 'allMax') {
        ctx.values[v.name] = max;
      } else {
        ctx.values[v.name] = Math.random() > 0.5 ? min : max;
      }
    }
  }
}

export class RandomStrategy implements Strategy {
  name = 'random';

  apply(config: ParseResult, ctx: GenContext): void {
    const deferred: VariableDef[] = [];

    for (const v of config.variables) {
      if (ctx.values[v.name] !== undefined) continue;
      const min = v.min ?? 1;
      if (v.maxVar === undefined || v.maxVar in ctx.values) {
        const max = v.maxVar && v.maxVar in ctx.values
          ? ctx.values[v.maxVar]
          : v.max ?? 1000000000;
        ctx.values[v.name] = randInt(min, max);
      } else {
        deferred.push(v);
      }
    }

    for (const v of deferred) {
      if (ctx.values[v.name] !== undefined) continue;
      const min = v.min ?? 1;
      const max = v.maxVar && v.maxVar in ctx.values
        ? ctx.values[v.maxVar]
        : v.max ?? 1000000000;
      ctx.values[v.name] = randInt(min, max);
    }
  }
}

export function resolveStrategies(strategies: StrategyConfig[]): Strategy[] {
  const map: Record<string, new (options?: Record<string, any>) => Strategy> = {
    scale: ScaleStrategy,
    boundary: BoundaryValueStrategy,
    random: RandomStrategy,
  };

  return strategies.map(sc => {
    const Cls = map[sc.type];
    if (!Cls) return new RandomStrategy();
    return new Cls(sc.options);
  });
}
