import { Sport } from '@prisma/client';

export function impliedProbability(odds: number) {
  return odds > 0 ? 1 / odds : 0;
}

export function expectedValue(estimatedProbability: number, odds: number) {
  return estimatedProbability * odds - 1;
}

export function edgePct(estimatedProbability: number, implied: number) {
  return estimatedProbability - implied;
}

function clamp(p: number) {
  return Math.max(0.01, Math.min(0.99, p));
}

/**
 * Heuristic sport model (SIM-ready):
 * - football: favors balance + liquidity (market efficiency)
 * - tennis: sharper favorite/underdog separation
 * - mma: more variance (finish risk), confidence penalized when odds are wide
 */
export function estimateProbabilityBySport(params: {
  sport: Sport;
  implied: number;
  odds: number;
  liquidity: number;
  isFavorite: boolean;
}) {
  const { sport, implied, odds, liquidity, isFavorite } = params;

  // liquidity reliability 0..1
  const liqScore = Math.max(0, Math.min(1, liquidity / 2500));

  let delta = 0;
  let confidence = 0.5;
  let factors: string[] = [];

  if (sport === 'SOCCER') {
    // football market usually efficient; edge is conservative
    delta = 0.008 + liqScore * 0.012;
    confidence = 0.45 + liqScore * 0.35;
    factors = ['forma reciente/equilibrio', 'mercado líquido'];
  } else if (sport === 'TENNIS') {
    // tennis allows stronger favorite edges in some matchups
    delta = isFavorite ? 0.02 + liqScore * 0.01 : 0.012 + liqScore * 0.008;
    confidence = 0.5 + liqScore * 0.3;
    factors = ['superficie/ranking', 'head-to-head'];
  } else {
    // MMA/UFC: high variance; add edge but reduce confidence on long odds
    const variancePenalty = odds > 3 ? 0.006 : 0;
    delta = 0.018 + liqScore * 0.012 - variancePenalty;
    confidence = 0.42 + liqScore * 0.28 - (odds > 3 ? 0.08 : 0);
    factors = ['estilo de pelea y método de victoria', 'riesgo de finish'];
  }

  const estimated = clamp(implied + delta);
  confidence = Math.max(0.25, Math.min(0.95, confidence));

  return {
    estimatedProbability: estimated,
    confidence,
    factors,
  };
}