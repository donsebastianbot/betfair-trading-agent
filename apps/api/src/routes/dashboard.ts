import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const dashboardRouter = Router();

dashboardRouter.get('/overview', async (_req, res) => {
  const cfg = await prisma.systemConfig.upsert({ where: { id: 'singleton' }, update: {}, create: { id: 'singleton' } });
  const totalBets = await prisma.bet.count();
  const activeBets = await prisma.bet.count({ where: { status: { in: ['PENDING', 'MATCHED', 'PARTIAL', 'UNMATCHED'] } } });
  const settled = await prisma.bet.findMany({ where: { status: 'SETTLED' } });
  const profit = settled.reduce((a, b) => a + (b.pnl || 0), 0);
  const wins = settled.filter((b) => (b.pnl || 0) > 0).length;
  const winRate = settled.length ? wins / settled.length : 0;
  const stakeSum = settled.reduce((a, b) => a + (b.stake || 0), 0);
  const roi = stakeSum ? profit / stakeSum : 0;

  const decisions = await prisma.decision.findMany({
    include: { analysis: true, bet: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const bets = await prisma.bet.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });

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
  });
});