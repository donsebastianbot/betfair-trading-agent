import { SystemConfig } from '@prisma/client';

export function calcStake(bankroll: number, stakePct: number, confidence: number, maxStake: number) {
  const raw = bankroll * stakePct * confidence;
  return Math.max(2, Math.min(raw, maxStake));
}

export function canBet(config: SystemConfig, openBets: number, dailyPnl: number, liquidity: number, edge: number) {
  if (config.autoPaused) return { ok: false, reason: 'auto-paused by risk controls' };
  if (openBets >= config.maxOpenBets) return { ok: false, reason: 'max open bets reached' };
  if (dailyPnl <= -Math.abs(config.maxDailyLoss)) return { ok: false, reason: 'daily loss limit exceeded' };
  if (liquidity < config.minLiquidity) return { ok: false, reason: 'insufficient liquidity' };
  if (edge < config.minEdgePct) return { ok: false, reason: 'edge too small' };
  return { ok: true, reason: 'risk checks passed' };
}