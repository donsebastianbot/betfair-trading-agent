import { Router } from 'express';
import { runAgentCycle } from '../services/runner.js';

export const agentRouter = Router();

agentRouter.post('/run-once', async (_req, res) => {
  await runAgentCycle();
  res.json({ ok: true, mode: 'direct-run' });
});