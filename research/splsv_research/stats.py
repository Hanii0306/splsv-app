"""Small, dependency-free statistics used in the research analysis (no SciPy needed)."""

from __future__ import annotations

import math
from statistics import fmean, stdev
from typing import Sequence


def _betacf(a: float, b: float, x: float) -> float:
    """Continued fraction for the regularized incomplete beta (Numerical Recipes)."""
    qab, qap, qam = a + b, a + 1.0, a - 1.0
    c, d = 1.0, 1.0 - qab * x / qap
    d = 1.0 / (d if abs(d) > 1e-30 else 1e-30)
    h = d
    for m in range(1, 300):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1.0 + aa * d
        d = 1.0 / (d if abs(d) > 1e-30 else 1e-30)
        c = 1.0 + aa / c if abs(c) > 1e-30 else 1e-30
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1.0 + aa * d
        d = 1.0 / (d if abs(d) > 1e-30 else 1e-30)
        c = 1.0 + aa / c if abs(c) > 1e-30 else 1e-30
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < 3e-12:
            break
    return h


def betainc(a: float, b: float, x: float) -> float:
    """Regularized incomplete beta I_x(a, b)."""
    if x <= 0:
        return 0.0
    if x >= 1:
        return 1.0
    lbeta = math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b) + a * math.log(x) + b * math.log(1 - x)
    if x < (a + 1) / (a + b + 2):
        return math.exp(lbeta) * _betacf(a, b, x) / a
    return 1.0 - math.exp(lbeta) * _betacf(b, a, 1 - x) / b


def t_two_sided_p(t: float, df: int) -> float:
    """Two-sided p-value for Student's t with df degrees of freedom."""
    return betainc(df / 2.0, 0.5, df / (df + t * t))


def paired_t(before: Sequence[float], after: Sequence[float]) -> dict:
    """Paired-samples t-test (after − before)."""
    if len(before) != len(after) or len(before) < 2:
        raise ValueError("Butuh minimal 2 pasang data dengan panjang sama.")
    diffs = [b - a for a, b in zip(before, after)]
    n = len(diffs)
    md, sd = fmean(diffs), stdev(diffs)
    if sd == 0:
        return {"n": n, "mean_diff": md, "sd_diff": 0.0, "t": math.inf if md else 0.0, "df": n - 1, "p": 0.0 if md else 1.0}
    t = md / (sd / math.sqrt(n))
    return {"n": n, "mean_diff": md, "sd_diff": sd, "t": t, "df": n - 1, "p": t_two_sided_p(t, n - 1)}


def cronbach_alpha(items: Sequence[Sequence[float]]) -> float:
    """Cronbach's alpha. items[i][j] = score of respondent j on item i (≥ 2 items, ≥ 2 respondents)."""
    k = len(items)
    if k < 2 or len(items[0]) < 2:
        raise ValueError("Butuh minimal 2 butir dan 2 responden.")
    totals = [sum(col) for col in zip(*items)]
    var = lambda xs: stdev(xs) ** 2  # noqa: E731
    sum_item_var = sum(var(i) for i in items)
    total_var = var(totals)
    if total_var == 0:
        return float("nan")
    return k / (k - 1) * (1 - sum_item_var / total_var)


def describe(xs: Sequence[float]) -> dict:
    xs = list(xs)
    return {
        "n": len(xs),
        "mean": fmean(xs) if xs else float("nan"),
        "sd": stdev(xs) if len(xs) > 1 else 0.0,
        "min": min(xs) if xs else float("nan"),
        "max": max(xs) if xs else float("nan"),
    }
