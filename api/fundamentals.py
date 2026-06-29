"""
GET /api/fundamentals?symbol=RELIANCE&exchange=NSE

Hybrid data sources:
  price (CMP)   -> Angel One SmartAPI  (real-time LTP, falls back to yfinance on failure)
  EPS, beta,    -> Yahoo Finance (yfinance)
  shares, etc.

Angel One rate limits (https://smartapi.angelone.in/docs/RateLimit):
  Access Token API : 1 request / user / day
  Market Data Quote: ~10 req / s
  searchScrip      : ~10 req / s

Mitigation:
  - Module-level SmartConnect instance reused across warm serverless invocations.
  - Symbol -> symboltoken mapping cached at module level (token IDs never change).
  - 6-hour CDN cache on this endpoint (s-maxage=21600) prevents repeated calls.
  - All Angel One failures degrade gracefully to yfinance for the price field.
"""

import json
import math
import os
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

try:
    import yfinance as yf
    YFINANCE_OK = True
except ImportError:
    YFINANCE_OK = False

try:
    import pyotp
    from SmartApi import SmartConnect
    ANGEL_OK = True
except ImportError:
    ANGEL_OK = False


# ──────────────────────────── Angel One session cache ─────────────
# Kept at module level so warm serverless instances reuse the same
# authenticated client without burning the 1-auth-per-day limit.

_ao_client = None
_ao_auth_expiry = 0.0       # Unix timestamp
_ao_token_cache = {}        # {"SYMBOL:EXCHANGE": "symboltoken"}


def _ao_get_client():
    """Return a valid SmartConnect client, re-authenticating only if expired."""
    global _ao_client, _ao_auth_expiry

    if not ANGEL_OK:
        return None

    now = time.time()
    if _ao_client is not None and now < _ao_auth_expiry:
        return _ao_client

    api_key     = os.getenv("ANGEL_API_KEY", "")
    client_id   = os.getenv("ANGEL_CLIENT_ID", "")
    password    = os.getenv("ANGEL_PASSWORD", "")
    totp_secret = os.getenv("ANGEL_TOTP_SECRET", "")

    if not all([api_key, client_id, password, totp_secret]):
        return None

    try:
        totp   = pyotp.TOTP(totp_secret).now()
        client = SmartConnect(api_key=api_key)
        resp   = client.generateSession(client_id, password, totp)
        if resp.get("status"):
            _ao_client      = client
            _ao_auth_expiry = now + 3600 * 20   # conservative 20-hour TTL
            return _ao_client
    except Exception:
        pass

    return None


def _ao_get_ltp(symbol, exchange):
    """
    Return the real-time LTP from Angel One. Returns float or None on any failure.
    The module-level token cache means searchScrip is only called once per symbol.
    """
    global _ao_token_cache

    client = _ao_get_client()
    if client is None:
        return None

    cache_key = f"{symbol}:{exchange}"
    token     = _ao_token_cache.get(cache_key)

    if token is None:
        try:
            result = client.searchScrip(exchange, symbol)
            if result and result.get("data"):
                # NSE equity tradingsymbol = "SYMBOL-EQ"
                target = f"{symbol}-EQ" if exchange == "NSE" else symbol
                for item in result["data"]:
                    if item["tradingsymbol"] == target:
                        token = item["symboltoken"]
                        break
                # Fallback: first result
                if token is None and result["data"]:
                    token = result["data"][0]["symboltoken"]
                if token:
                    _ao_token_cache[cache_key] = token
        except Exception:
            return None

    if token is None:
        return None

    try:
        quote = client.getMarketData("LTP", {exchange: [token]})
        if quote and quote.get("data") and quote["data"].get("fetched"):
            ltp = quote["data"]["fetched"][0].get("ltp")
            return _clean(ltp)
    except Exception:
        pass

    return None


# ──────────────────────────── helpers ─────────────────────────────

def _to_cr(v, default=None):
    """Absolute INR -> INR Cr (/ 1e7), rounded to 2dp."""
    if v is None:
        return default
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return default
        return round(f / 1e7, 2)
    except (TypeError, ValueError):
        return default


def _clean(v, default=None, decimals=4):
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


def _wrap(value, as_of, source="yahoo_finance"):
    """Wrap a value in provenance metadata."""
    if value is None:
        return None
    return {"value": value, "source": source, "asOf": as_of}


def _stmt_val(frame, *keys):
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


def _cagr(values):
    """Compute CAGR from list of (year, value) newest-first. Returns % or None."""
    valids = [v for _, v in values if v is not None and v > 0]
    if len(valids) < 2:
        return None
    n = len(valids) - 1
    try:
        return round(((valids[0] / valids[-1]) ** (1 / n) - 1) * 100, 1)
    except (ZeroDivisionError, ValueError):
        return None


# ──────────────────────────── core fetch ──────────────────────────

def fetch_fundamentals(symbol, exchange):
    """
    Module-level function — testable without HTTP plumbing.
    Returns the same dict the HTTP handler serialises.
    """
    as_of = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # 1. Angel One: real-time LTP -----------------------------------------
    ao_price = _ao_get_ltp(symbol, exchange)

    # 2. yfinance: EPS + all fundamentals ---------------------------------
    if not YFINANCE_OK:
        if ao_price is not None:
            return {
                "ok": True, "symbol": symbol, "rawSymbol": symbol, "asOf": as_of,
                "fields": {"price": _wrap(ao_price, as_of, "angel_one")},
                "fetchedCount": 1, "totalFields": 1, "priceSource": "angel_one",
                "dataNote": "yfinance unavailable; only real-time CMP from Angel One.",
            }
        return {"ok": False, "error": "yfinance not installed", "manualMode": True}

    suffix     = ".BO" if (exchange == "BSE" or symbol.isdigit()) else ".NS"
    ticker_sym = f"{symbol}{suffix}"

    try:
        tk = yf.Ticker(ticker_sym)

        try:
            info = tk.info or {}
        except Exception:
            info = {}

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

        # Price: prefer Angel One (real-time); yfinance as fallback
        if ao_price is not None:
            price        = ao_price
            price_source = "angel_one"
        else:
            price = _clean(
                info.get("regularMarketPrice")
                or info.get("currentPrice")
                or info.get("previousClose")
            )
            price_source = "yahoo_finance"

        shares_cr  = _to_cr(info.get("sharesOutstanding"))
        mkt_cap_cr = _to_cr(info.get("marketCap"))
        beta       = _clean(info.get("beta"), decimals=3)
        eps        = _clean(info.get("trailingEps"), decimals=2)
        bvps       = _clean(info.get("bookValue"), decimals=2)

        roe_frac   = _clean(info.get("returnOnEquity"), decimals=6)
        roe_pct    = round(roe_frac * 100, 2) if roe_frac is not None else None

        payout_frac = _clean(info.get("payoutRatio"), decimals=6)
        payout_pct  = round(payout_frac * 100, 2) if payout_frac is not None else None

        ebitda_raw = info.get("ebitda") or _stmt_val(income_stmt, "EBITDA", "Normalized EBITDA")
        ebitda_cr  = _to_cr(ebitda_raw)

        ebit_raw = _stmt_val(income_stmt, "EBIT", "Operating Income") or info.get("operatingIncome")
        ebit_cr  = _to_cr(ebit_raw)

        da_raw = (
            _stmt_val(cashflow, "Depreciation And Amortization", "Depreciation & Amortization")
            or _stmt_val(income_stmt, "Reconciled Depreciation", "Depreciation And Amortization In Income Statement")
        )
        da_cr = _to_cr(da_raw)

        tax_raw    = _stmt_val(income_stmt, "Tax Provision", "Income Tax Expense")
        pretax_raw = _stmt_val(income_stmt, "Pretax Income")
        if tax_raw is not None and pretax_raw and pretax_raw != 0:
            eff_tax_pct = round(max(0.15, min(0.35, tax_raw / pretax_raw)) * 100, 2)
        else:
            eff_tax_pct = 25.0

        int_raw = _stmt_val(income_stmt, "Interest Expense", "Interest Expense Non Operating", "Net Interest Income")
        int_cr  = _to_cr(abs(int_raw) if int_raw is not None else None)

        ocf_raw = _stmt_val(cashflow, "Operating Cash Flow", "Cash Flows From Operations") or info.get("operatingCashflow")
        ocf_cr  = _to_cr(ocf_raw)

        capex_raw = _stmt_val(
            cashflow, "Capital Expenditure", "Purchase Of Ppe",
            "Capital Expenditures", "Purchases Of Property Plant And Equipment"
        )
        capex_cr = _to_cr(abs(capex_raw) if capex_raw is not None else None)

        fcf_raw = _stmt_val(cashflow, "Free Cash Flow")
        if fcf_raw is not None:
            fcf_cr = _to_cr(fcf_raw)
        elif ocf_cr is not None and capex_cr is not None:
            fcf_cr = round(ocf_cr - capex_cr, 2)
        else:
            fcf_cr = None

        iss_raw = _stmt_val(cashflow, "Issuance Of Debt", "Long Term Debt Issuance", "Proceeds From Issuance Of Long Term Debt")
        rep_raw = _stmt_val(cashflow, "Repayment Of Debt", "Long Term Debt Payments", "Repayment Of Long Term Debt")
        if iss_raw is not None or rep_raw is not None:
            net_borr_cr = round((_to_cr(iss_raw or 0) or 0) - (_to_cr(abs(rep_raw or 0)) or 0), 2)
        else:
            net_borr_cr = None

        debt_raw = _stmt_val(balance_sheet, "Total Debt", "Long Term Debt And Capital Lease Obligation")
        if debt_raw is None:
            lt = _stmt_val(balance_sheet, "Long Term Debt")
            st = _stmt_val(balance_sheet, "Current Debt", "Short Long Term Debt", "Current Portion Of Long Term Debt")
            if lt is not None:
                debt_raw = (lt or 0) + (st or 0)
        total_debt_cr = _to_cr(debt_raw)

        cash_raw = _stmt_val(balance_sheet, "Cash And Cash Equivalents", "Cash Equivalents")
        sti_raw  = _stmt_val(balance_sheet, "Other Short Term Investments", "Short Term Investments")
        cash_cr  = (
            _to_cr((cash_raw or 0) + (sti_raw or 0)) if cash_raw is not None
            else _to_cr(info.get("totalCash"))
        )

        cwc_raw = _stmt_val(cashflow, "Change In Working Capital", "Changes In Working Capital")
        cwc_cr  = _to_cr(cwc_raw)

        # Historical NI CAGR for growth helper
        ni_hist = []
        if income_stmt is not None and not income_stmt.empty:
            try:
                for col in list(income_stmt.columns[:4]):
                    yr     = str(col)[:4]
                    ni_val = None
                    for ni_key in ("Net Income", "Net Income From Continuing Operations"):
                        if ni_key in income_stmt.index:
                            raw = income_stmt.loc[ni_key, col]
                            ni_val = (
                                _to_cr(float(raw))
                                if raw is not None and not (isinstance(raw, float) and math.isnan(raw))
                                else None
                            )
                            if ni_val is not None:
                                break
                    ni_hist.append((yr, ni_val))
            except Exception:
                pass

        hist_ni_cagr = _cagr(ni_hist) if len(ni_hist) >= 2 else None

        fields = {
            "price":                    _wrap(price, as_of, price_source),
            "sharesOutstanding":        _wrap(shares_cr, as_of),
            "marketCap":                _wrap(mkt_cap_cr, as_of),
            "beta":                     _wrap(beta, as_of),
            "trailingEps":              _wrap(eps, as_of),
            "bookValuePerShare":        _wrap(bvps, as_of),
            "roe":                      _wrap(roe_pct, as_of),
            "payoutRatio":              _wrap(payout_pct, as_of),
            "ebitda":                   _wrap(ebitda_cr, as_of),
            "ebit":                     _wrap(ebit_cr, as_of),
            "depreciationAmortization": _wrap(da_cr, as_of),
            "taxRate":                  _wrap(eff_tax_pct, as_of),
            "interestExpense":          _wrap(int_cr, as_of),
            "operatingCashFlow":        _wrap(ocf_cr, as_of),
            "capex":                    _wrap(capex_cr, as_of),
            "freeCashFlow":             _wrap(fcf_cr, as_of),
            "netBorrowings":            _wrap(net_borr_cr, as_of),
            "totalDebt":                _wrap(total_debt_cr, as_of),
            "cashAndEquivalents":       _wrap(cash_cr, as_of),
            "changeInWorkingCapital":   _wrap(cwc_cr, as_of),
        }

        fetched = sum(1 for v in fields.values() if v is not None)

        return {
            "ok":           True,
            "symbol":       ticker_sym,
            "rawSymbol":    symbol,
            "asOf":         as_of,
            "fields":       fields,
            "histNiCagr":   hist_ni_cagr,
            "histYears":    len([v for _, v in ni_hist if v is not None]),
            "fetchedCount": fetched,
            "totalFields":  len(fields),
            "priceSource":  price_source,
            "dataNote": (
                "CMP from Angel One (real-time). EPS, beta, and financial data from "
                "Yahoo Finance — may be unlabelled consolidated figures. "
                "Verify key metrics at screener.in before use."
                if price_source == "angel_one" else
                "All data from Yahoo Finance. Indian equity data may be unlabelled "
                "consolidated figures. Verify at screener.in before use."
            ),
        }

    except Exception as exc:
        return {"ok": False, "error": str(exc), "partial": True, "manualMode": True}


# ──────────────────────────── HTTP handler ────────────────────────

class handler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        pass

    def do_GET(self):
        qs       = parse_qs(urlparse(self.path).query)
        symbol   = qs.get("symbol",   [""])[0].upper().strip()
        exchange = qs.get("exchange", ["NSE"])[0].upper()

        if not symbol:
            self._json(400, {"ok": False, "error": "symbol is required"})
            return

        result = fetch_fundamentals(symbol, exchange)

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
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
