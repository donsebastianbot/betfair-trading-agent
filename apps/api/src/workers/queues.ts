import { Queue, Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { runAgentCycle } from '../services/runner.js';

export const analysisQueue = new Queue('analysis', { connection: redis });

export const analysisWorker = new Worker(
  'analysis',
  async () => {
    await runAgentCycle();
  },
  { connection: redis }
);

export async function scheduleRecurring() {
  await analysisQueue.upsertJobScheduler('agent-cycle', { every: 60_000 }, { name: 'agent-cycle' });
}