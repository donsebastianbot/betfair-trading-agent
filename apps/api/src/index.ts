import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import { systemRouter } from './routes/system.js';
import { dashboardRouter } from './routes/dashboard.js';
import { agentRouter } from './routes/agent.js';
import { journalRouter } from './routes/journal.js';

const app = express();
const log = pino();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, mode: process.env.APP_MODE || 'SIM' }));
app.use('/system', systemRouter);
app.use('/dashboard', dashboardRouter);
app.use('/agent', agentRouter);
app.use('/journal', journalRouter);

const port = Number(process.env.API_PORT || 4001);

app.listen(port, () => log.info(`API listening on ${port}`));