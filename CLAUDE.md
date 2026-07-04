# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Intrinsic Value Workbench — an educational stock valuation calculator for Indian equities (NSE/BSE). Users pick a stock, pull (or manually enter) its fundamentals, and get intrinsic-value estimates from four independent methods: DCF, PE Multiple, Residual Income, and EV/EBITDA. A Comparison Dashboard blends the four into a weighted estimate with a margin-of-safety buy-below price.

This is explicitly framed as an educational tool, not investment advice — the app is not SEBI-registered. That framing shows up throughout the UI (disclaimer footer, "Educational Tool" badge, sample-data warning banners, the copy-to-clipboard summary). Preserve this tone/disclaimer language when touching user-facing copy.

## Commands

```bash
npm run dev          # Vite dev server
npm run build         # tsc -b && vite build
npm run lint          # eslint .
npm run test          # vitest run (single run)
npm run test:watch    # vitest watch mode
npx vitest run src/lib/calculations/dcf.test.ts   # single test file
npx vitest run -t "some test name"                # single test by name
```

Python backend (`api/*.py`, deployed as Vercel serverless functions):
```bash
pip install -r requirements.txt
pytest api/test_fundamentals.py -v
```
Note: `api/test_fundamentals.py` currently imports `to_cr`, `clean`, `wrap`, `stmt_val`, `cagr`, and calls `handler()._fetch(...)` from `api/fundamentals.py` — but the current `fundamentals.py` (post Angel One refactor) exposes underscore-prefixed helpers (`_to_cr`, `_clean`, etc.) and a module-level `fetch_fundamentals()` function instead of a `handler._fetch` method. The test file is stale and will fail on import until updated to match. Don't assume this suite is green without checking.

There is no `.env.example`. Local Angel One integration requires `ANGEL_API_KEY`, `ANGEL_CLIENT_ID`, `ANGEL_PASSWORD`, `ANGEL_TOTP_SECRET` env vars (see `api/fundamentals.py`); without them the app still works, just falls back to yfinance-only pricing.

## Architecture

**Frontend**: Vite + React 18 + TypeScript + Tailwind. Charts via Recharts. `package.json` lists `zustand` as a dependency but it is unused — actual state management is a single React Context + `useReducer` in `src/context/ValuationContext.tsx`, persisted to `localStorage` per stock symbol (key `ivw2_<SYMBOL>`). Don't reach for zustand; extend the reducer instead.

**Backend**: Two Python serverless functions under `api/`, written as raw `BaseHTTPRequestHandler` subclasses (no Flask/FastAPI), deployed per `vercel.json`.
- `api/quote.py` — lightweight polling endpoint, yfinance only, 5-min CDN cache.
- `api/fundamentals.py` — the main data source. Hybrid sourcing: real-time price (LTP) comes from Angel One SmartAPI with yfinance as fallback; everything else (EPS, beta, ROE, cash-flow line items, balance-sheet figures, historical NI CAGR) comes from yfinance. Angel One auth is rate-limited to 1 request/day, so the `SmartConnect` client and the symbol→token map are cached at module level to survive warm serverless invocations; a 6-hour CDN cache on the endpoint further limits calls. All Angel One failures degrade silently to yfinance.

**Data flow / provenance model**: every fundamental value is a `Field` (`src/types/index.ts`): `{ value, source: 'fetched' | 'edited' | 'manual' | 'sample', asOf }`. This provenance tracking is load-bearing, not decorative — it drives the "auto"-filled input styling, the post-fetch review banner, the sample-data warning banner, and the "Mark as reviewed" flow. Any code touching `Fundamentals` must preserve `source`/`asOf`, not just the raw number. When a user edits a fetched field, `source` flips to `'edited'`.

Units: all monetary fundamentals are stored in ₹ Crores (backend divides raw INR by `1e7`), except per-share figures (price, EPS, book value/share) which stay in ₹. Rates/percentages are stored as whole numbers in state (e.g. `rfRate: 7.0` = 7%) and only converted to decimals at the point they're passed into `src/lib/calculations/*` — those pure functions all expect decimals.

**Calculation core** (`src/lib/calculations/*.ts`): pure, UI-free, unit-tested (`*.test.ts` colocated, several with hand-verified worked-example comments). `capm.ts` computes bottom-up beta (Damodaran industry unlevered betas in `src/lib/data/industryBetas.ts`, Hamada re-levering) or accepts a direct beta, then cost of equity and WACC. `dcf.ts` is a 2-stage (5+5 year) FCFF/FCFE model with a Gordon Growth terminal value, sensitivity grid, and an exit-multiple cross-check. `pe.ts`, `ev.ts`, `residualIncome.ts` are simpler single-formula models (RI supports perpetuity / linear-fade / abrupt-stop terminal treatments).

**Derived state**: `ValuationContext.tsx` exports `getDerivedCAPM(state)` and `getDiscountRate(state, override, useOverride, useWACC)` — these are the single source of truth for cost of equity/WACC and are called from every tab and from `ComparisonDashboard`. Don't recompute CAPM locally in a tab component; use these.

**Per-tab structure**: `src/components/tabs/{DCF,PE,RI,EV}Tab.tsx` each hold Simple/Advanced mode UI, read/write their slice of `ValuationState` via `SET_DCF`/`SET_PE`/etc. actions, and call the corresponding `calculations/*` function directly. `ComparisonDashboard.tsx` independently re-derives all four methods' results (`useMethodResults`) to build the blended estimate — the derivation logic there must be kept in sync with what each tab does if a tab's input handling changes.

**Stock list**: `src/lib/data/stocks.ts` only covers NIFTY100 (with a TODO to extend to NIFTY500) and marks `damodaranIndustry` mappings as needing review — treat both as incomplete/unverified rather than authoritative.
