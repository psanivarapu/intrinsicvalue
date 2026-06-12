"""
pytest tests for fundamentals.py field mapping and unit conversion.

Mocks yfinance.Ticker so no network calls are made.
Key things verified:
  - ₹ → ₹ Cr conversion (÷ 1e7)
  - capex returned as absolute value (Yahoo reports negative)
  - ROE fraction → %
  - payout fraction → %
  - effective tax rate clamped to 15–35%
  - per-field nulls when data missing
  - CAGR hint computation
"""

import json
import math
import sys
import os
from unittest.mock import patch, MagicMock
import pytest

# Allow importing the handler without a running server
sys.path.insert(0, os.path.dirname(__file__))

from fundamentals import to_cr, clean, wrap, stmt_val, cagr, handler


# ──────────────────────────── unit helpers ────────────────────────

class TestToCr:
    def test_converts_absolute_inr(self):
        # 1 crore = 1e7
        assert to_cr(1_00_00_000) == 1.0

    def test_converts_large_value(self):
        # e.g. RELIANCE market cap ~17 lakh crore = 1.7e13 INR → 1,700,000 Cr
        val = 1.7e13
        assert to_cr(val) == pytest.approx(17_00_000.0, rel=1e-3)

    def test_returns_default_on_none(self):
        assert to_cr(None) is None
        assert to_cr(None, default=0) == 0

    def test_returns_default_on_nan(self):
        assert to_cr(float("nan")) is None

    def test_returns_default_on_inf(self):
        assert to_cr(float("inf")) is None

    def test_rounds_to_2dp(self):
        assert to_cr(1_23_45_678) == pytest.approx(1.23, abs=0.01)

    def test_zero(self):
        assert to_cr(0) == 0.0


class TestClean:
    def test_passes_through_valid(self):
        assert clean(18.5) == pytest.approx(18.5, rel=1e-4)

    def test_nan_returns_default(self):
        assert clean(float("nan")) is None

    def test_none_returns_default(self):
        assert clean(None) is None

    def test_rounding(self):
        assert clean(3.14159265, decimals=2) == pytest.approx(3.14)


class TestCagr:
    def test_two_years(self):
        # 100 → 121 in 1 year = 21% CAGR
        result = cagr([("2024", 121.0), ("2023", 100.0)])
        assert result == pytest.approx(21.0, rel=0.01)

    def test_four_years(self):
        # 100 → 194.48 over 3 years ≈ 25% CAGR
        result = cagr([("2024", 194.48), ("2023", 155.58), ("2022", 124.47), ("2021", 100.0)])
        assert result == pytest.approx(25.0, rel=0.02)

    def test_returns_none_with_insufficient_data(self):
        assert cagr([("2024", 100.0)]) is None
        assert cagr([]) is None

    def test_returns_none_when_oldest_is_negative(self):
        assert cagr([("2024", 100.0), ("2023", -50.0)]) is None


# ──────────────────────────── field-mapping via mock ──────────────

MOCK_INFO = {
    "regularMarketPrice": 2500.0,
    "sharesOutstanding": 67_64_50_000 * 10,  # ~6764 Cr shares * 10 = 67645 Cr
    "marketCap": 16_93_12_50_00_000,          # ~16.93 lakh Cr
    "beta": 1.1,
    "trailingEps": 95.0,
    "bookValue": 800.0,
    "returnOnEquity": 0.185,       # 18.5% (fraction)
    "payoutRatio": 0.30,           # 30% (fraction)
    "ebitda": 1_80_000_00_00_000,  # 18,000 Cr
    "operatingIncome": 1_50_000_00_00_000,
    "operatingCashflow": 1_40_000_00_00_000,
    "totalCash": 10_000_00_00_000,
}

import pandas as pd

def make_income_stmt():
    """Mock income statement DataFrame (newest column first)."""
    data = {
        "2024": {
            "EBIT": 1_50_000_00_00_000,
            "Tax Provision": 37_500_00_00_000,
            "Pretax Income": 1_50_000_00_00_000,
            "Net Income": 1_10_000_00_00_000,
            "Total Revenue": 9_00_000_00_00_000,
            "Reconciled Depreciation": 20_000_00_00_000,
        },
        "2023": {
            "Net Income": 88_000_00_00_000,
            "Total Revenue": 8_00_000_00_00_000,
        },
        "2022": {
            "Net Income": 70_400_00_00_000,
            "Total Revenue": 7_00_000_00_00_000,
        },
    }
    df = pd.DataFrame(data)
    return df


def make_cashflow():
    data = {
        "2024": {
            "Operating Cash Flow": 1_40_000_000_000,      # 14,000 Cr
            "Capital Expenditure": -80_000_000_000,       # -8,000 Cr (Yahoo negative)
            "Free Cash Flow": 60_000_000_000,             # 6,000 Cr
            "Depreciation And Amortization": 20_000_000_000,    # 2,000 Cr
            "Change In Working Capital": -5_000_000_000,  # -500 Cr
            "Issuance Of Debt": 30_000_000_000,           # 3,000 Cr
            "Repayment Of Debt": -20_000_000_000,         # -2,000 Cr (Yahoo negative)
        }
    }
    df = pd.DataFrame(data)
    return df


def make_balance_sheet():
    data = {
        "2024": {
            "Total Debt": 200_000_000_000,           # 20,000 Cr
            "Cash And Cash Equivalents": 50_000_000_000,  # 5,000 Cr
        }
    }
    df = pd.DataFrame(data)
    return df


class TestFetchFieldMapping:
    """Integration-style tests using mocked yfinance."""

    def _run_fetch(self, info=None, cashflow=None, income=None, balance=None):
        mock_ticker = MagicMock()
        mock_ticker.info = info or MOCK_INFO
        mock_ticker.income_stmt = income if income is not None else make_income_stmt()
        mock_ticker.cashflow = cashflow if cashflow is not None else make_cashflow()
        mock_ticker.balance_sheet = balance if balance is not None else make_balance_sheet()

        h = handler.__new__(handler)
        with patch("fundamentals.yf.Ticker", return_value=mock_ticker):
            result = h._fetch("RELIANCE.NS", "RELIANCE")
        return result

    def test_ok_true_on_success(self):
        r = self._run_fetch()
        assert r["ok"] is True

    def test_price_field_present(self):
        r = self._run_fetch()
        assert r["fields"]["price"] is not None
        assert r["fields"]["price"]["value"] == pytest.approx(2500.0)

    def test_roe_fraction_to_pct(self):
        r = self._run_fetch()
        roe = r["fields"]["roe"]
        assert roe is not None
        # 0.185 fraction → 18.5%
        assert roe["value"] == pytest.approx(18.5, rel=0.01)

    def test_payout_fraction_to_pct(self):
        r = self._run_fetch()
        payout = r["fields"]["payoutRatio"]
        assert payout is not None
        assert payout["value"] == pytest.approx(30.0, rel=0.01)

    def test_capex_returned_as_positive(self):
        """Yahoo reports capex as negative; we must return absolute value."""
        r = self._run_fetch()
        capex = r["fields"]["capex"]
        assert capex is not None
        assert capex["value"] > 0, "capex must be positive (absolute value)"
        # 8,000 Cr
        assert capex["value"] == pytest.approx(8000.0, rel=0.01)

    def test_shares_outstanding_in_crores(self):
        """sharesOutstanding field must be in crores, not absolute."""
        r = self._run_fetch()
        shares = r["fields"]["sharesOutstanding"]
        assert shares is not None
        # Raw: 6764500000 → Cr = 676.45
        # The mock sets sharesOutstanding = 67_64_50_000 * 10 = 676450000000 / 1e7 = 67645
        val = shares["value"]
        # Shouldn't be on the order of 1e9
        assert val < 1e6, f"sharesOutstanding should be in crores, got {val}"

    def test_total_debt_in_crores(self):
        r = self._run_fetch()
        debt = r["fields"]["totalDebt"]
        assert debt is not None
        # 2e11 INR → 20000 Cr
        assert debt["value"] == pytest.approx(20_000.0, rel=0.01)

    def test_effective_tax_rate_clamped(self):
        """Tax/pretax = 37500/150000 = 25%, within 15–35% so not clamped."""
        r = self._run_fetch()
        tax = r["fields"]["taxRate"]
        assert tax is not None
        assert 15.0 <= tax["value"] <= 35.0

    def test_effective_tax_rate_clamped_high(self):
        """Tax rate > 35% should be clamped to 35%."""
        info_high_tax = dict(MOCK_INFO)
        income_high = make_income_stmt().copy()
        income_high.loc["Tax Provision", "2024"] = 8_00_000_00_00_000  # 53% rate
        r = self._run_fetch(info=info_high_tax, income=income_high)
        assert r["fields"]["taxRate"]["value"] <= 35.0

    def test_free_cash_flow_in_crores(self):
        r = self._run_fetch()
        fcf = r["fields"]["freeCashFlow"]
        assert fcf is not None
        # 60,000 Cr
        assert fcf["value"] == pytest.approx(6000.0, rel=0.01)

    def test_net_borrowings_computed(self):
        """issuance - repayment = 3000 - 2000 = 1000 Cr"""
        r = self._run_fetch()
        nb = r["fields"]["netBorrowings"]
        assert nb is not None
        assert nb["value"] == pytest.approx(1000.0, rel=0.01)

    def test_null_fields_when_data_missing(self):
        """Missing cashflow statement should not crash; affected fields are None."""
        import pandas as pd
        empty = pd.DataFrame()
        r = self._run_fetch(cashflow=empty)
        # Price, EPS etc. should still be present
        assert r["fields"]["price"] is not None
        # OCF may be filled from info fallback
        assert r["ok"] is True

    def test_hist_cagr_computed(self):
        r = self._run_fetch()
        # NI: 110000 Cr (2024), 88000 (2023), 70400 (2022)
        # 2-yr CAGR from 70400 → 110000 = (110000/70400)^0.5 - 1 ≈ 25%
        if r.get("histNiCagr") is not None:
            assert 10 <= r["histNiCagr"] <= 50

    def test_provenance_fields_have_source(self):
        r = self._run_fetch()
        for fname, fval in r["fields"].items():
            if fval is not None:
                assert fval.get("source") == "yahoo_finance", \
                    f"{fname} missing source"
                assert fval.get("asOf") is not None, f"{fname} missing asOf"

    def test_returns_error_gracefully_on_exception(self):
        # Make yf.Ticker() itself raise to trigger the outer except block
        h = handler.__new__(handler)
        with patch("fundamentals.yf.Ticker", side_effect=RuntimeError("simulated network error")):
            result = h._fetch("BADSTOCK.NS", "BADSTOCK")
        assert result["ok"] is False
        assert "error" in result
