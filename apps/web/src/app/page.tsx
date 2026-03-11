async function getOverview() {
  const res = await fetch('http://api:4001/dashboard/overview', { cache: 'no-store' }).catch(async () =>
    fetch('http://localhost:4001/dashboard/overview', { cache: 'no-store' })
  );
  return res.json();
}

export default async function Home() {
  const data = await getOverview();

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 34, margin: 0 }}>Betfair Autonomous Trading Agent</h1>
      <p style={{ color: '#a1a1aa' }}>Terminal de control · modo <b>{data.mode}</b> · autoPause {String(data.autoPaused)}</p>

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

      <p style={{ color: '#71717a', marginTop: 16, fontSize: 12 }}>
        Seguridad: en SIM no se ejecutan apuestas reales. Para LIVE cambia el modo manualmente y valida credenciales Betfair oficiales.
      </p>
    </main>
  );
}