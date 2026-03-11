export function impliedProbability(odds: number) {
  return odds > 0 ? 1 / odds : 0;
}

export function expectedValue(estimatedProbability: number, odds: number) {
  return estimatedProbability * odds - 1;
}

export function edgePct(estimatedProbability: number, implied: number) {
  return estimatedProbability - implied;
}

export function estimateProbabilityFromStats(base: number, confidenceAdj: number) {
  const p = base + confidenceAdj;
  return Math.max(0.01, Math.min(0.99, p));
}