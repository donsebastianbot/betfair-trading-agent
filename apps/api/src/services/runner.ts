import { prisma } from '../lib/prisma.js';
import { BetfairClient } from '../betfair/client.js';
import { edgePct, expectedValue, impliedProbability } from '../engine/probability.js';
import { calcStake, canBet } from '../engine/risk.js';

export async function runAgentCycle() {
  const cfg = await prisma.systemConfig.upsert({ where: { id: 'singleton' }, update: {}, create: { id: 'singleton' } });

  const client = new BetfairClient();

  // Example market query: soccer/tennis/mma next 24h
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  let markets: any[] = [];
  if (cfg.mode === 'LIVE' && process.env.APP_MODE === 'LIVE') {
    await client.loginWithSessionToken();
    markets = await client.listMarketCatalogue({
      eventTypeIds: ['1', '2', '7522'],
      marketTypeCodes: ['MATCH_ODDS'],
      marketStartTime: { from: now.toISOString(), to: in24h.toISOString() },
    }, 25);
  } else {
    // SIM fallback sample markets (no external call needed)
    markets = [
      {
        marketId: `SIM-${Date.now()}-1`,
        marketStartTime: in24h.toISOString(),
        event: { id: `SIM-EVT-${Date.now()}`, name: 'SIM Team A v SIM Team B' },
        competition: { name: 'SIM League' },
      },
    ];
  }

  for (const m of markets) {
    const marketId = m.marketId as string;
    const marketBook = (cfg.mode === 'LIVE' && process.env.APP_MODE === 'LIVE')
      ? await client.listMarketBook([marketId])
      : [{
          status: 'OPEN',
          runners: [
            { selectionId: 1, ex: { availableToBack: [{ price: 2.2 }], availableToLay: [{ price: 2.24 }], tradedVolume: [{ size: 600 }] } },
            { selectionId: 2, ex: { availableToBack: [{ price: 1.8 }], availableToLay: [{ price: 1.83 }], tradedVolume: [{ size: 700 }] } },
          ],
        }];
    const book = marketBook?.[0];
    if (!book || book.status !== 'OPEN') continue;

    const eventId = String(m.event?.id || marketId);
    await prisma.event.upsert({
      where: { id: eventId },
      update: {
        competition: m.competition?.name || null,
        homeName: m.event?.name || null,
        startTime: new Date(m.marketStartTime),
      },
      create: {
        id: eventId,
        sport: 'SOCCER',
        competition: m.competition?.name || null,
        homeName: m.event?.name || null,
        startTime: new Date(m.marketStartTime),
      },
    });

    for (const r of book.runners || []) {
      const bestBack = r.ex?.availableToBack?.[0]?.price || 0;
      const liquidity = r.ex?.tradedVolume?.reduce((a: number, x: any) => a + x.size, 0) || 0;
      if (!bestBack) continue;

      await prisma.marketSnapshot.create({
        data: {
          eventId,
          marketId,
          selectionId: r.selectionId,
          runnerName: String(r.selectionId),
          bestBack,
          bestLay: r.ex?.availableToLay?.[0]?.price || bestBack,
          tradedVolume: liquidity,
          marketStatus: book.status,
        },
      });

      // Placeholder "model" probability
      const estimated = Math.min(0.9, impliedProbability(bestBack) + 0.04);
      const implied = impliedProbability(bestBack);
      const ev = expectedValue(estimated, bestBack);
      const edge = edgePct(estimated, implied);
      const confidence = Math.max(0.2, Math.min(1, edge * 8));

      const analysis = await prisma.analysis.create({
        data: {
          eventId,
          marketId,
          selectionId: r.selectionId,
          runnerName: String(r.selectionId),
          impliedProbability: implied,
          estimatedProbability: estimated,
          edgePct: edge,
          expectedValue: ev,
          liquidity,
          confidence,
          rationale: `Modelo estima ${(estimated * 100).toFixed(1)}% vs implícita ${(implied * 100).toFixed(1)}%. EV ${(ev * 100).toFixed(1)}%.`,
        },
      });

      const openBets = await prisma.bet.count({ where: { status: { in: ['PENDING', 'MATCHED', 'PARTIAL', 'UNMATCHED'] } } });
      const dayStart = new Date(); dayStart.setHours(0,0,0,0);
      const settled = await prisma.bet.findMany({ where: { updatedAt: { gte: dayStart }, status: 'SETTLED' } });
      const dailyPnl = settled.reduce((a, b) => a + (b.pnl || 0), 0);

      const risk = canBet(cfg, openBets, dailyPnl, liquidity, edge);
      if (!risk.ok || ev <= 0) {
        await prisma.decision.create({
          data: { analysisId: analysis.id, action: 'IGNORE', reason: `No bet: ${risk.reason}; EV=${ev.toFixed(3)}` },
        });
        continue;
      }

      const stake = calcStake(cfg.bankroll, cfg.stakePct, confidence, cfg.maxStake);
      const decision = await prisma.decision.create({
        data: {
          analysisId: analysis.id,
          action: 'BET',
          stake,
          reason: `VALUE BET DETECTED. ${analysis.rationale} Liquidez OK (${liquidity.toFixed(0)}). Stake ${stake.toFixed(2)}.`,
        },
      });

      if (cfg.mode === 'SIM' || process.env.APP_MODE !== 'LIVE') {
        await prisma.bet.create({
          data: {
            decisionId: decision.id,
            marketId,
            selectionId: r.selectionId,
            side: 'BACK',
            odds: bestBack,
            stake,
            status: 'MATCHED',
            matchedSize: stake,
            avgPriceMatched: bestBack,
          },
        });
      } else {
        const result = await client.placeOrders({
          marketId,
          instructions: [{ selectionId: r.selectionId, side: 'BACK', orderType: 'LIMIT', limitOrder: { size: stake, price: bestBack, persistenceType: 'LAPSE' } }],
          customerRef: `agent-${Date.now()}`,
        });
        const betId = result?.instructionReports?.[0]?.betId || null;
        await prisma.bet.create({
          data: {
            decisionId: decision.id,
            betfairBetId: betId,
            marketId,
            selectionId: r.selectionId,
            side: 'BACK',
            odds: bestBack,
            stake,
            status: 'PENDING',
          },
        });
      }
    }
  }
}