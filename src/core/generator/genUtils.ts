export interface GenContext {
  values: Record<string, number>;
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function resolveNum(ref: string | undefined, ctx: GenContext): number | undefined {
  if (ref === undefined) return undefined;
  const num = Number(ref);
  if (!isNaN(num)) return num;
  return ctx.values[ref];
}
