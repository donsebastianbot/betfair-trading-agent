import { Router } from 'express';
import { analysisQueue } from '../workers/queues.js';

export const agentRouter = Router();

agentRouter.post('/run-once', async (_req, res) => {
  const job = await analysisQueue.add('manual-cycle', {});
  res.json({ ok: true, jobId: job.id });
});