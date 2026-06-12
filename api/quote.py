"""
GET /api/quote?symbol=RELIANCE&exchange=NSE

Returns last traded price and metadata. Lightweight endpoint for polling.
Uses fast_info for speed; falls back to info dict.
Cache: 5 min (CDN) so live price is reasonably fresh.
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


class handler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        pass

    def do_GET(self):
        qs = parse_qs(urlparse(self.path).query)
        symbol = qs.get("symbol", [""])[0].upper().strip()
        exchange = qs.get("exchange", ["NSE"])[0].upper()

        if not symbol:
            self._respond({"ok": False, "error": "symbol is required"})
            return

        suffix = ".BO" if (exchange == "BSE" or symbol.isdigit()) else ".NS"
        ticker_sym = f"{symbol}{suffix}"

        if not YFINANCE_OK:
            self._respond({"ok": False, "error": "yfinance not installed"})
            return

        try:
            tk = yf.Ticker(ticker_sym)

            # fast_info is the most reliable path for live price
            price = None
            currency = "INR"
            market_time = None

            try:
                fi = tk.fast_info
                price = getattr(fi, "last_price", None) or getattr(fi, "regular_market_price", None)
                currency = getattr(fi, "currency", "INR") or "INR"
                last_volume = getattr(fi, "last_volume", None)
                market_time = None
            except Exception:
                pass

            # fallback to info dict
            if price is None or (isinstance(price, float) and math.isnan(price)):
                try:
                    info = tk.info or {}
                    price = (
                        info.get("regularMarketPrice")
                        or info.get("currentPrice")
                        or info.get("previousClose")
                    )
                    currency = info.get("currency", "INR")
                except Exception:
                    pass

            if price is None:
                self._respond({"ok": False, "error": f"No price data for {ticker_sym}"})
                return

            self._respond({
                "ok": True,
                "symbol": ticker_sym,
                "rawSymbol": symbol,
                "price": round(float(price), 2),
                "currency": currency,
                "priceSource": "yahoo_finance",
                "asOf": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            }, cache="s-maxage=300, stale-while-revalidate=60")

        except Exception as exc:
            self._respond({"ok": False, "error": str(exc)})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

    def _respond(self, body, cache=None):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        if cache:
            self.send_header("Cache-Control", cache)
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())
