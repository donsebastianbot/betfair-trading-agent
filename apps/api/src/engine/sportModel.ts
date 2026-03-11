import { Sport } from '@prisma/client';

export type SportFeatureSet = {
  // normalized 0..1 features (higher is better for selection)
  form: number;
  matchup: number;
  context: number;
  marketQuality: number;
};

export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

// Placeholder feature extraction hook (replace with real providers/APIs later)
export function buildFeatures(params: {
  sport: Sport;
  implied: number;
  odds: number;
  liquidity: number;
  isFavorite: boolean;
}): SportFeatureSet {
  const { sport, implied, odds, liquidity, isFavorite } = params;
  const marketQuality = clamp01(liquidity / 3000);

  if (sport === 'SOCCER') {
    return {
      form: clamp01(0.45 + (isFavorite ? 0.08 : -0.02)),
      matchup: clamp01(0.5 + (isFavorite ? 0.04 : 0.0)),
      context: clamp01(0.5 + marketQuality * 0.1),
      marketQuality,
    };
  }

  if (sport === 'TENNIS') {
    return {
      form: clamp01(0.5 + (isFavorite ? 0.12 : -0.03)),
      matchup: clamp01(0.5 + (isFavorite ? 0.09 : 0.01)),
      context: clamp01(0.48 + marketQuality * 0.15),
      marketQuality,
    };
  }

  // MMA
  const longShotPenalty = odds > 3 ? 0.08 : 0;
  return {
    form: clamp01(0.5 + (isFavorite ? 0.06 : -0.01) - longShotPenalty),
    matchup: clamp01(0.5 + (isFavorite ? 0.05 : 0.02) - longShotPenalty),
    context: clamp01(0.46 + marketQuality * 0.12),
    marketQuality,
  };
}

export function weightedScore(sport: Sport, f: SportFeatureSet) {
  // sport-specific weights
  if (sport === 'SOCCER') return f.form * 0.35 + f.matchup * 0.25 + f.context * 0.2 + f.marketQuality * 0.2;
  if (sport === 'TENNIS') return f.form * 0.4 + f.matchup * 0.3 + f.context * 0.15 + f.marketQuality * 0.15;
  return f.form * 0.3 + f.matchup * 0.3 + f.context * 0.2 + f.marketQuality * 0.2; // MMA
}

export function calibrateProbability(implied: number, score: number, sport: Sport) {
  // calibrated uplift by sport (conservative)
  const baseUplift = sport === 'SOCCER' ? 0.018 : sport === 'TENNIS' ? 0.028 : 0.024;
  const uplift = baseUplift * (0.5 + score);
  return clamp01(implied + uplift);
}

export function confidenceFrom(score: number, liquidity: number) {
  const liq = clamp01(liquidity / 3000);
  return clamp01(0.35 + score * 0.4 + liq * 0.25);
}
