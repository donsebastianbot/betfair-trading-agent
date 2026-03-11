import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const systemRouter = Router();

systemRouter.get('/config', async (_req, res) => {
  const cfg = await prisma.systemConfig.upsert({ where: { id: 'singleton' }, update: {}, create: { id: 'singleton' } });
  res.json(cfg);
});

systemRouter.post('/mode', async (req, res) => {
  const { mode } = req.body as { mode: 'SIM' | 'LIVE' };
  if (!['SIM', 'LIVE'].includes(mode)) return res.status(400).json({ error: 'Invalid mode' });
  const cfg = await prisma.systemConfig.upsert({
    where: { id: 'singleton' },
    update: { mode },
    create: { id: 'singleton', mode },
  });
  res.json(cfg);
});

systemRouter.post('/pause', async (req, res) => {
  const { paused } = req.body as { paused: boolean };
  const cfg = await prisma.systemConfig.upsert({
    where: { id: 'singleton' },
    update: { autoPaused: !!paused },
    create: { id: 'singleton', autoPaused: !!paused },
  });
  res.json(cfg);
});