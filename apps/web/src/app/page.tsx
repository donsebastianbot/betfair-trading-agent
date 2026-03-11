"use client";

import { useEffect, useState } from 'react';

type Overview = {
  mode: 'SIM' | 'LIVE';
  autoPaused: boolean;
  totalBets: number;
  activeBets: number;
  profit: number;
  winRate: number;
  roi: number;
  decisions: any[];
  bets: any[];
  bankrollSeries: { t: string; bankroll: number }[];
  sportPerformance: { sport: string; bets: number; pnl: number }[];
  strategyPerformance: { strategy: string; bets: number; pnl: number }[];
  risk: {
    dailyPnl: number;
    openExposure: number;
    maxDrawdownPct: number;
    maxDailyLoss: number;
    maxSimultaneousRisk: number;
  };
};

const API_BASE = '/api/proxy';

export default function Home() {
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`${API_BASE}/dashboard/overview`);
    setData(await res.json());
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  async function setMode(mode: 'SIM' | 'LIVE') {
    setBusy(true);
    await fetch(`${API_BASE}/system/mode`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    await load();
    setBusy(false);
  }

  async function setPause(paused: boolean) {
    setBusy(true);
    await fetch(`${API_BASE}/system/pause`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paused }),
    });
    await load();
    setBusy(false);
  }

  async function runCycle() {
    setBusy(true);
    await fetch(`${API_BASE}/agent/run-once`, { method: 'POST' });
    await load();
    setBusy(false);
  }

  if (!data) return <main style={{ padding: 24, color: '#fff', background: '#09090b', minHeight: '100vh' }}>Cargando dashboard...</main>;

  const minB = Math.min(...(data.bankrollSeries.map((x) => x.bankroll).concat([1000])));
  const maxB = Math.max(...(data.bankrollSeries.map((x) => x.bankroll).concat([1000])));

  return (
    <main style={{ maxWidth: 1250, margin: '0 auto', padding: 24, color: '#fafafa', background: '#09090b', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 34, margin: 0 }}>Betfair Autonomous Trading Agent</h1>
      <p style={{ color: '#a1a1aa' }}>Modo <b>{data.mode}</b> · AutoPause <b>{String(data.autoPaused)}</b></p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <button disabled={busy} onClick={() => setMode('SIM')}>SIM</button>
        <button disabled={busy} onClick={() => setMode('LIVE')}>LIVE</button>
        <button disabled={busy} onClick={() => setPause(!data.autoPaused)}>{data.autoPaused ? 'Reanudar agente' : 'Pausar agente'}</button>
        <button disabled={busy} onClick={runCycle}>Run cycle now</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 12, marginTop: 18 }}>
        {[
          ['Beneficio total', data.profit?.toFixed(2)],
          ['ROI', `${((data.roi || 0) * 100).toFixed(2)}%`],
          ['Win rate', `${((data.winRate || 0) * 100).toFixed(1)}%`],
          ['Apuestas totales', data.totalBets],
          ['Apuestas activas', data.activeBets],
        ].map(([k, v]) => (
          <div key={String(k)} style={{ border: '1px solid #27272a', borderRadius: 12, padding: 12, background: '#111114' }}>
            <div style={{ color: '#a1a1aa', fontSize: 12 }}>{k}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{String(v)}</div>
          </div>
        ))}
      </div>

      <section style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 12 }}>
        <div style={{ border: '1px solid #27272a', borderRadius: 12, padding: 12, background: '#111114' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Evolución del bank</div>
          <div style={{ height: 140, display: 'flex', alignItems: 'end', gap: 4 }}>
            {(data.bankrollSeries.length ? data.bankrollSeries : [{ t: new Date().toISOString(), bankroll: 1000 }]).slice(-40).map((p, i) => {
              const h = maxB === minB ? 40 : Math.max(8, ((p.bankroll - minB) / (maxB - minB)) * 120);
              return <div key={i} title={`${p.bankroll}`} style={{ width: 8, height: h, background: '#22c55e', borderRadius: 4 }} />;
            })}
          </div>
        </div>

        <div style={{ border: '1px solid #27272a', borderRadius: 12, padding: 12, background: '#111114' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Riesgo (tiempo real)</div>
          <div style={{ fontSize: 13, color: '#d4d4d8', lineHeight: 1.7 }}>
            <div>PnL diario: <b>{data.risk.dailyPnl.toFixed(2)}</b> / límite {-Math.abs(data.risk.maxDailyLoss).toFixed(2)}</div>
            <div>Exposición abierta: <b>{data.risk.openExposure.toFixed(2)}</b> / máximo {data.risk.maxSimultaneousRisk.toFixed(2)}</div>
            <div>Drawdown máx: <b>{data.risk.maxDrawdownPct.toFixed(2)}%</b></div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ border: '1px solid #27272a', borderRadius: 12, padding: 12, background: '#111114' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Rendimiento por deporte</div>
          {(data.sportPerformance || []).map((s) => (
            <div key={s.sport} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
              <span>{s.sport}</span><span>{s.bets} bets · PnL {s.pnl.toFixed(2)}</span>
            </div>
          ))}
          {(!data.sportPerformance || data.sportPerformance.length === 0) && <div style={{ color: '#a1a1aa', fontSize: 13 }}>Sin datos todavía.</div>}
        </div>

        <div style={{ border: '1px solid #27272a', borderRadius: 12, padding: 12, background: '#111114' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Rendimiento por estrategia</div>
          {(data.strategyPerformance || []).map((s) => (
            <div key={s.strategy} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
              <span>{s.strategy}</span><span>{s.bets} bets · PnL {s.pnl.toFixed(2)}</span>
            </div>
          ))}
          {(!data.strategyPerformance || data.strategyPerformance.length === 0) && <div style={{ color: '#a1a1aa', fontSize: 13 }}>Sin datos todavía.</div>}
        </div>
      </section>

      <section style={{ marginTop: 18, border: '1px solid #27272a', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #27272a', fontWeight: 700 }}>Apuestas (tiempo real)</div>
        <div style={{ maxHeight: 320, overflow: 'auto' }}>
          {(data.bets || []).map((b: any) => (
            <div key={b.id} style={{ padding: 10, borderBottom: '1px solid #1f1f23', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr', gap: 8 }}>
              <div>{b.marketId}</div>
              <div>{b.side}</div>
              <div>odds {b.odds}</div>
              <div>stake {b.stake}</div>
              <div><b>{b.status}</b></div>
            </div>
          ))}
          {data.bets.length === 0 && <div style={{ padding: 12, color: '#a1a1aa' }}>Sin apuestas todavía.</div>}
        </div>
      </section>

      <section style={{ marginTop: 18, border: '1px solid #27272a', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #27272a', fontWeight: 700 }}>Decisiones del agente (explicadas)</div>
        <div style={{ maxHeight: 500, overflow: 'auto' }}>
          {(data.decisions || []).map((d: any) => (
            <div key={d.id} style={{ padding: 12, borderBottom: '1px solid #1f1f23' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div><b>{d.action}</b> · stake: {d.stake ?? '-'} </div>
                <div style={{ color: '#a1a1aa', fontSize: 12 }}>{new Date(d.createdAt).toLocaleString()}</div>
              </div>
              <div style={{ fontSize: 13, color: '#d4d4d8', marginTop: 6 }}>{d.reason}</div>
              {d.analysis && (
                <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 6 }}>
                  p_impl: {(d.analysis.impliedProbability * 100).toFixed(1)}% · p_est: {(d.analysis.estimatedProbability * 100).toFixed(1)}% · EV: {(d.analysis.expectedValue * 100).toFixed(2)}%
                </div>
              )}
            </div>
          ))}
          {(!data.decisions || data.decisions.length === 0) && <div style={{ padding: 12, color: '#a1a1aa' }}>Sin decisiones todavía.</div>}
        </div>
      </section>
    </main>
  );
}
