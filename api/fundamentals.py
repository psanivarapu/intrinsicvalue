"""
GET /api/fundamentals?symbol=RELIANCE&exchange=NSE

Returns pre-fillable fundamentals for a stock, each wrapped in provenance metadata.
All currency values are converted from absolute INR to INR Crore (÷ 1e7).
Per-share values remain in ₹.

Yahoo Finance data for Indian equities is generally consolidated but unlabelled as such.
Data quality is weaker for small/mid caps. The UX always prompts user verification.

capex: Yahoo Finance reports capex as negative in the cashflow statement.
       We return the absolute value and document this here.

changeInWorkingCapital: Positive = WC increased (cash outflow in FCFF).
                        Sign is preserved from Yahoo; user sees the raw sign.
"""

import json
import math
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

try:
    import yfinance as yf
    YFINANCE_OK = True
except ImportError:
    YFINANCE_OK = False


# ──────────────────────────── helpers ────────────────────────────

def to_cr(v, default=None):
    """Absolute INR → INR Cr (÷ 1e7), rounded to 2dp. None on bad input."""
    if v is None:
        return default
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return default
        return round(f / 1e7, 2)
    except (TypeError, ValueError):
        return default


def clean(v, default=None, decimals=4):
    """Strip NaN/inf, round to decimals. None on bad input."""
    if v is None:
        return default
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return default
        return round(f, decimals)
    except (TypeError, ValueError):
        return default


def wrap(value, as_of):
    """Wrap a scalar value in provenance envelope. Returns None if value is None."""
    if value is None:
        return None
    return {"value": value, "source": "yahoo_finance", "asOf": as_of}


def stmt_val(frame, *keys):
    """Try each key in a DataFrame index; return first valid float or None."""
    if frame is None:
        return None
    try:
        if frame.empty:
            return None
    except Exception:
        return None
    for key in keys:
        if key in frame.index:
            try:
                row = frame.loc[key]
                for val in row.values:
                    if val is not None and not (isinstance(val, float) and (math.isnan(val) or math.isinf(val))):
                        return float(val)
            except Exception:
                continue
    return None


def cagr(values):
    """Compute CAGR from a list of (year, value) newest-first. Returns % or None."""
    valids = [v for _, v in values if v is not None and v > 0]
    if len(valids) < 2:
        return None
    n = len(valids) - 1
    try:
        return round(((valids[0] / valids[-1]) ** (1 / n) - 1) * 100, 1)
    except (ZeroDivisionError, ValueError):
        return None


# ──────────────────────────── handler ────────────────────────────

class handler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        pass  # suppress access logs

    def do_GET(self):
        qs = parse_qs(urlparse(self.path).query)
        symbol = qs.get("symbol", [""])[0].upper().strip()
        exchange = qs.get("exchange", ["NSE"])[0].upper()

        if not symbol:
            self._json(400, {"ok": False, "error": "symbol is required"})
            return

        suffix = ".BO" if (exchange == "BSE" or symbol.isdigit()) else ".NS"
        ticker_sym = f"{symbol}{suffix}"

        result = self._fetch(ticker_sym, symbol)

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        # 6h CDN cache, 24h stale-while-revalidate
        self.send_header("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()

    def _json(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())

    def _fetch(self, ticker_sym, raw_symbol):
        if not YFINANCE_OK:
            return {"ok": False, "error": "yfinance not installed", "manualMode": True}

        as_of = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        try:
            tk = yf.Ticker(ticker_sym)

            # ── info dict ──────────────────────────────────────────
            try:
                info = tk.info or {}
            except Exception:
                info = {}

            # ── statements (timeout-tolerant) ──────────────────────
            income_stmt = cashflow = balance_sheet = None
            try:
                income_stmt = tk.income_stmt
            except Exception:
                pass
            try:
                cashflow = tk.cashflow
            except Exception:
                pass
            try:
                balance_sheet = tk.balance_sheet
            except Exception:
                pass

            # ── price ──────────────────────────────────────────────
            price = clean(
                info.get("regularMarketPrice")
                or info.get("currentPrice")
                or info.get("previousClose")
            )

            # ── shares outstanding → Cr ────────────────────────────
            shares_cr = to_cr(info.get("sharesOutstanding"))

            # ── market cap → Cr ────────────────────────────────────
            mkt_cap_cr = to_cr(info.get("marketCap"))

            # ── beta ───────────────────────────────────────────────
            beta = clean(info.get("beta"), decimals=3)

            # ── EPS ────────────────────────────────────────────────
            eps = clean(info.get("trailingEps"), decimals=2)

            # ── book value per share ───────────────────────────────
            bvps = clean(info.get("bookValue"), decimals=2)

            # ── ROE: fraction → % ──────────────────────────────────
            roe_frac = clean(info.get("returnOnEquity"), decimals=6)
            roe_pct = round(roe_frac * 100, 2) if roe_frac is not None else None

            # ── payout ratio: fraction → % ─────────────────────────
            payout_frac = clean(info.get("payoutRatio"), decimals=6)
            payout_pct = round(payout_frac * 100, 2) if payout_frac is not None else None

            # ── EBITDA → Cr ────────────────────────────────────────
            ebitda_raw = info.get("ebitda") or stmt_val(
                income_stmt, "EBITDA", "Normalized EBITDA"
            )
            ebitda_cr = to_cr(ebitda_raw)

            # ── EBIT → Cr ──────────────────────────────────────────
            ebit_raw = stmt_val(income_stmt, "EBIT", "Operating Income")
            if ebit_raw is None:
                ebit_raw = info.get("operatingIncome")
            ebit_cr = to_cr(ebit_raw)

            # ── D&A → Cr ───────────────────────────────────────────
            da_raw = stmt_val(
                cashflow,
                "Depreciation And Amortization",
                "Depreciation & Amortization",
            ) or stmt_val(
                income_stmt,
                "Reconciled Depreciation",
                "Depreciation And Amortization In Income Statement",
            )
            da_cr = to_cr(da_raw)

            # ── effective tax rate: clamped 15–35% ─────────────────
            tax_raw = stmt_val(income_stmt, "Tax Provision", "Income Tax Expense")
            pretax_raw = stmt_val(income_stmt, "Pretax Income")
            if tax_raw is not None and pretax_raw and pretax_raw != 0:
                raw_rate = tax_raw / pretax_raw
                eff_tax_pct = round(max(0.15, min(0.35, raw_rate)) * 100, 2)
            else:
                eff_tax_pct = 25.0  # India corporate default

            # ── interest expense → Cr ──────────────────────────────
            int_raw = stmt_val(
                income_stmt,
                "Interest Expense",
                "Interest Expense Non Operating",
                "Net Interest Income",
            )
            # Yahoo sometimes returns negative; use absolute
            int_cr = to_cr(abs(int_raw) if int_raw is not None else None)

            # ── operating cash flow → Cr ───────────────────────────
            ocf_raw = stmt_val(
                cashflow, "Operating Cash Flow", "Cash Flows From Operations"
            )
            if ocf_raw is None:
                ocf_raw = info.get("operatingCashflow")
            ocf_cr = to_cr(ocf_raw)

            # ── capex → Cr (absolute value; Yahoo reports negative) ─
            capex_raw = stmt_val(
                cashflow,
                "Capital Expenditure",
                "Purchase Of Ppe",
                "Capital Expenditures",
                "Purchases Of Property Plant And Equipment",
            )
            capex_cr = to_cr(abs(capex_raw) if capex_raw is not None else None)

            # ── free cash flow → Cr ────────────────────────────────
            fcf_raw = stmt_val(cashflow, "Free Cash Flow")
            if fcf_raw is not None:
                fcf_cr = to_cr(fcf_raw)
            elif ocf_cr is not None and capex_cr is not None:
                fcf_cr = round(ocf_cr - capex_cr, 2)
            else:
                fcf_cr = None

            # ── net borrowings → Cr ────────────────────────────────
            iss_raw = stmt_val(
                cashflow,
                "Issuance Of Debt",
                "Long Term Debt Issuance",
                "Proceeds From Issuance Of Long Term Debt",
            )
            rep_raw = stmt_val(
                cashflow,
                "Repayment Of Debt",
                "Long Term Debt Payments",
                "Repayment Of Long Term Debt",
            )
            if iss_raw is not None or rep_raw is not None:
                iss_cr = to_cr(iss_raw or 0) or 0
                rep_cr = to_cr(abs(rep_raw or 0)) or 0
                net_borr_cr = round(iss_cr - rep_cr, 2)
            else:
                net_borr_cr = None

            # ── total debt → Cr ────────────────────────────────────
            debt_raw = stmt_val(
                balance_sheet,
                "Total Debt",
                "Long Term Debt And Capital Lease Obligation",
            )
            if debt_raw is None:
                lt = stmt_val(balance_sheet, "Long Term Debt")
                st = stmt_val(
                    balance_sheet,
                    "Current Debt",
                    "Short Long Term Debt",
                    "Current Portion Of Long Term Debt",
                )
                if lt is not None:
                    debt_raw = (lt or 0) + (st or 0)
            total_debt_cr = to_cr(debt_raw)

            # ── cash → Cr ──────────────────────────────────────────
            cash_raw = stmt_val(
                balance_sheet, "Cash And Cash Equivalents", "Cash Equivalents"
            )
            sti_raw = stmt_val(
                balance_sheet,
                "Other Short Term Investments",
                "Short Term Investments",
            )
            if cash_raw is not None:
                cash_cr = to_cr((cash_raw or 0) + (sti_raw or 0))
            else:
                cash_cr = to_cr(info.get("totalCash"))

            # ── change in working capital → Cr (preserve sign) ────
            # Positive = WC increased = cash outflow from operations
            cwc_raw = stmt_val(
                cashflow,
                "Change In Working Capital",
                "Changes In Working Capital",
            )
            cwc_cr = to_cr(cwc_raw)

            # ── historical income for CAGR hint ────────────────────
            ni_hist = []
            rev_hist = []
            if income_stmt is not None and not income_stmt.empty:
                try:
                    cols = list(income_stmt.columns[:4])
                    for col in cols:
                        yr = str(col)[:4]
                        ni_val = None
                        rev_val = None
                        for ni_key in ("Net Income", "Net Income From Continuing Operations"):
                            if ni_key in income_stmt.index:
                                raw = income_stmt.loc[ni_key, col]
                                ni_val = to_cr(float(raw)) if raw is not None and not (isinstance(raw, float) and math.isnan(raw)) else None
                                if ni_val is not None:
                                    break
                        for rev_key in ("Total Revenue", "Revenue"):
                            if rev_key in income_stmt.index:
                                raw = income_stmt.loc[rev_key, col]
                                rev_val = to_cr(float(raw)) if raw is not None and not (isinstance(raw, float) and math.isnan(raw)) else None
                                if rev_val is not None:
                                    break
                        ni_hist.append((yr, ni_val))
                        rev_hist.append((yr, rev_val))
                except Exception:
                    pass

            hist_ni_cagr = cagr(ni_hist) if len(ni_hist) >= 2 else None

            # ── assemble response ──────────────────────────────────
            fields = {
                "price":                    wrap(price, as_of),
                "sharesOutstanding":        wrap(shares_cr, as_of),
                "marketCap":                wrap(mkt_cap_cr, as_of),
                "beta":                     wrap(beta, as_of),
                "trailingEps":              wrap(eps, as_of),
                "bookValuePerShare":        wrap(bvps, as_of),
                "roe":                      wrap(roe_pct, as_of),
                "payoutRatio":              wrap(payout_pct, as_of),
                "ebitda":                   wrap(ebitda_cr, as_of),
                "ebit":                     wrap(ebit_cr, as_of),
                "depreciationAmortization": wrap(da_cr, as_of),
                "taxRate":                  wrap(eff_tax_pct, as_of),
                "interestExpense":          wrap(int_cr, as_of),
                "operatingCashFlow":        wrap(ocf_cr, as_of),
                "capex":                    wrap(capex_cr, as_of),
                "freeCashFlow":             wrap(fcf_cr, as_of),
                "netBorrowings":            wrap(net_borr_cr, as_of),
                "totalDebt":                wrap(total_debt_cr, as_of),
                "cashAndEquivalents":       wrap(cash_cr, as_of),
                "changeInWorkingCapital":   wrap(cwc_cr, as_of),
            }

            fetched = sum(1 for v in fields.values() if v is not None)
            total = len(fields)

            return {
                "ok": True,
                "symbol": ticker_sym,
                "rawSymbol": raw_symbol,
                "asOf": as_of,
                "fields": fields,
                "histNiCagr": hist_ni_cagr,
                "histYears": len([v for _, v in ni_hist if v is not None]),
                "fetchedCount": fetched,
                "totalFields": total,
                "dataNote": (
                    "Yahoo Finance data for Indian equities is generally consolidated "
                    "but may be unlabelled as such. Data quality for small/mid caps is "
                    "weaker. Always verify key figures against screener.in before use."
                ),
            }

        except Exception as exc:
            return {
                "ok": False,
                "error": str(exc),
                "partial": True,
                "manualMode": True,
            }
