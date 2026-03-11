import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const dashboardRouter = Router();

dashboardRouter.get('/overview', async (_req, res) => {
  const cfg = await prisma.systemConfig.upsert({ where: { id: 'singleton' }, update: {}, create: { id: 'singleton' } });
  const totalBets = await prisma.bet.count();
  const activeBets = await prisma.bet.count({ where: { status: { in: ['PENDING', 'MATCHED', 'PARTIAL', 'UNMATCHED'] } } });
  const settled = await prisma.bet.findMany({ where: { status: 'SETTLED' }, orderBy: { placedAt: 'asc' } });
  const profit = settled.reduce((a, b) => a + (b.pnl || 0), 0);
  const wins = settled.filter((b) => (b.pnl || 0) > 0).length;
  const winRate = settled.length ? wins / settled.length : 0;
  const stakeSum = settled.reduce((a, b) => a + (b.stake || 0), 0);
  const roi = stakeSum ? profit / stakeSum : 0;

  const decisions = await prisma.decision.findMany({
    include: { analysis: { include: { event: true } }, bet: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const bets = await prisma.bet.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });

  // Bankroll curve
  let bankroll = cfg.bankroll;
  const bankrollSeries = settled.map((b) => {
    bankroll += b.pnl || 0;
    return { t: b.placedAt, bankroll: Number(bankroll.toFixed(2)) };
  });

  // Drawdown
  let peak = cfg.bankroll;
  let maxDd = 0;
  for (const p of bankrollSeries) {
    if (p.bankroll > peak) peak = p.bankroll;
    const dd = peak > 0 ? (peak - p.bankroll) / peak : 0;
    if (dd > maxDd) maxDd = dd;
  }

  // Daily loss today + exposure
  const dayStart = new Date(); dayStart.setHours(0,0,0,0);
  const settledToday = settled.filter((b) => b.updatedAt >= dayStart);
  const dailyPnl = settledToday.reduce((a, b) => a + (b.pnl || 0), 0);
  const openExposure = (await prisma.bet.findMany({ where: { status: { in: ['PENDING', 'MATCHED', 'PARTIAL', 'UNMATCHED'] } } }))
    .reduce((a, b) => a + b.stake, 0);

  // Performance by sport
  const bySportMap = new Map<string, { bets: number; pnl: number }>();
  for (const d of decisions) {
    if (!d.bet) continue;
    const sport = d.analysis?.event?.sport || 'UNKNOWN';
    const cur = bySportMap.get(sport) || { bets: 0, pnl: 0 };
    cur.bets += 1;
    cur.pnl += d.bet.pnl || 0;
    bySportMap.set(sport, cur);
  }
  const sportPerformance = Array.from(bySportMap.entries()).map(([sport, v]) => ({ sport, ...v }));

  // Performance by strategy (BACK/LAY)
  const byStrategy = bets.reduce<Record<string, { bets: number; pnl: number }>>((acc, b) => {
    const k = b.side;
    if (!acc[k]) acc[k] = { bets: 0, pnl: 0 };
    acc[k].bets += 1;
    acc[k].pnl += b.pnl || 0;
    return acc;
  }, {});
  const strategyPerformance = Object.entries(byStrategy).map(([strategy, v]) => ({ strategy, ...v }));

  res.json({
    mode: cfg.mode,
    autoPaused: cfg.autoPaused,
    totalBets,
    activeBets,
    profit,
    winRate,
    roi,
    decisions,
    bets,
    bankrollSeries,
    sportPerformance,
    strategyPerformance,
    risk: {
      dailyPnl,
      openExposure,
      maxDrawdownPct: Number((maxDd * 100).toFixed(2)),
      maxDailyLoss: cfg.maxDailyLoss,
      maxSimultaneousRisk: cfg.maxSimultaneousRisk,
    },
  });
});