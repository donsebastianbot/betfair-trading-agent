import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const journalRouter = Router();

journalRouter.get('/csv', async (_req, res) => {
  const decisions = await prisma.decision.findMany({
    include: { analysis: { include: { event: true } }, bet: true },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  const header = [
    'createdAt','action','reason','eventId','sport','marketId','selectionId','impliedProb','estimatedProb','edgePct','expectedValue','stake','betStatus','odds','pnl'
  ];

  const rows = decisions.map((d) => [
    d.createdAt.toISOString(),
    d.action,
    (d.reason || '').replace(/"/g, '""'),
    d.analysis?.eventId || '',
    d.analysis?.event?.sport || '',
    d.analysis?.marketId || '',
    d.analysis?.selectionId ?? '',
    d.analysis?.impliedProbability ?? '',
    d.analysis?.estimatedProbability ?? '',
    d.analysis?.edgePct ?? '',
    d.analysis?.expectedValue ?? '',
    d.stake ?? '',
    d.bet?.status || '',
    d.bet?.odds ?? '',
    d.bet?.pnl ?? '',
  ]);

  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="betfair-journal.csv"');
  res.send(csv);
});
