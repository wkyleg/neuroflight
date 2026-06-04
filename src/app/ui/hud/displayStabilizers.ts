export interface StableNumberOptions {
  maxStep: number;
  smoothing: number;
  deadband?: number;
}

export function nextStableNumber(current: number, target: number, options: StableNumberOptions): number {
  if (!Number.isFinite(target)) return current;
  if (!Number.isFinite(current)) return target;
  const deadband = options.deadband ?? 0.01;
  const delta = target - current;
  if (Math.abs(delta) <= deadband) return target;
  const easedStep = delta * Math.max(0, Math.min(1, options.smoothing));
  const clampedStep = Math.max(-options.maxStep, Math.min(options.maxStep, easedStep));
  return current + clampedStep;
}
