import { Queue, Worker } from 'bullmq';
import { runAgentCycle } from '../services/runner.js';

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

export const analysisQueue = new Queue('analysis', { connection });

export const analysisWorker = new Worker(
  'analysis',
  async () => {
    await runAgentCycle();
  },
  { connection }
);

export async function scheduleRecurring() {
  await analysisQueue.upsertJobScheduler('agent-cycle', { every: 60_000 }, { name: 'agent-cycle' });
}