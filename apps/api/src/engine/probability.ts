import { Sport } from '@prisma/client';
import { buildFeatures, calibrateProbability, confidenceFrom, weightedScore } from './sportModel.js';

export function impliedProbability(odds: number) {
  return odds > 0 ? 1 / odds : 0;
}

export function expectedValue(estimatedProbability: number, odds: number) {
  return estimatedProbability * odds - 1;
}

export function edgePct(estimatedProbability: number, implied: number) {
  return estimatedProbability - implied;
}

/**
 * Structured sport model (feature-based + calibration)
 */
export function estimateProbabilityBySport(params: {
  sport: Sport;
  implied: number;
  odds: number;
  liquidity: number;
  isFavorite: boolean;
}) {
  const { sport, implied, odds, liquidity, isFavorite } = params;

  const f = buildFeatures({ sport, implied, odds, liquidity, isFavorite });
  const score = weightedScore(sport, f);
  const estimatedProbability = calibrateProbability(implied, score, sport);
  const confidence = confidenceFrom(score, liquidity);

  const factors = [
    `form=${f.form.toFixed(2)}`,
    `matchup=${f.matchup.toFixed(2)}`,
    `context=${f.context.toFixed(2)}`,
    `marketQuality=${f.marketQuality.toFixed(2)}`,
    `score=${score.toFixed(2)}`,
  ];

  return { estimatedProbability, confidence, factors };
}