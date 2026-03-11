# Betfair Autonomous Sports Agent (SIM-first)

Sistema completo base para operar en Betfair Exchange con enfoque profesional y control de riesgo.

## Características clave
- API oficial Betfair (estructura de endpoints oficiales, sin scraping)
- Motor de análisis (probabilidad implícita vs estimada, EV y edge)
- Detección de value bets
- Motor de decisión (BET / IGNORE / WAIT)
- Gestión de banca y riesgo (límites, auto-pause, liquidez mínima)
- Ejecución SIM por defecto, LIVE solo manual
- Registro completo en PostgreSQL (análisis, decisiones, apuestas, snapshots)
- Dashboard dark estilo terminal (Next.js)
- Workers/cola con BullMQ para ciclo autónomo recurrente

## Estructura
- `apps/api`: backend Node + TypeScript + Prisma + BullMQ
- `apps/web`: dashboard Next.js + TypeScript
- `packages/shared`: tipos compartidos
- `docker-compose.yml`: Postgres + Redis + API + Web

## Modo seguro
- `APP_MODE=SIM` por defecto.
- En SIM no coloca apuestas reales (paper trading).
- Para LIVE debes activar explícitamente modo y credenciales Betfair válidas.

## Arranque (un solo comando)
```bash
cp .env.example .env
docker compose up --build
```

Después:
- API: http://localhost:4001
- Web: http://localhost:4010

## Flujo del agente
1. Detecta mercados próximos
2. Consulta cuotas y liquidez Betfair
3. Estima probabilidad propia
4. Compara con probabilidad implícita
5. Detecta value bets
6. Aplica reglas de riesgo
7. Decide BET/IGNORE/WAIT con explicación
8. Ejecuta (SIM/LIVE)
9. Monitoriza y registra métricas

## Endpoints API
- `GET /health`
- `GET /system/config`
- `POST /system/mode` (`SIM`/`LIVE`)
- `POST /system/pause` (true/false)
- `GET /dashboard/overview`
- `POST /agent/run-once` (dispara ciclo manual)

## Nota de integración Betfair
La base está lista con endpoints oficiales (`listMarketCatalogue`, `listMarketBook`, `placeOrders`, `cancelOrders`, `listCurrentOrders`).
Para producción LIVE debes completar autenticación por certificado y montar certificados en runtime de forma segura.
