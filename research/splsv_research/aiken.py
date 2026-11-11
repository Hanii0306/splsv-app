"""Aiken's V for expert content validation (task T-I01).

V = Σ s / (n (c − 1)), with s = r − lo, r = rating, lo = lowest category, c = number of categories,
n = number of raters. The pedoman notes that a few experts describe agreement; they do not prove
empirical validity of the instrument.
"""

from __future__ import annotations

import csv
from pathlib import Path


def aiken_v(ratings: list[float], lo: int = 1, hi: int = 5) -> float:
    if not ratings:
        raise ValueError("Tidak ada penilaian.")
    c = hi - lo + 1
    if any(r < lo or r > hi for r in ratings):
        raise ValueError(f"Skor harus di antara {lo} dan {hi}.")
    return sum(r - lo for r in ratings) / (len(ratings) * (c - 1))


def category(v: float) -> str:
    """Common interpretation: V > 0,8 tinggi; 0,4–0,8 sedang; < 0,4 rendah."""
    if v > 0.8:
        return "tinggi (valid)"
    if v >= 0.4:
        return "sedang"
    return "rendah (revisi)"


def analyse(table: dict[str, list[float]], lo: int = 1, hi: int = 5) -> list[dict]:
    """table = {item_or_aspect: [rating per expert, ...]}."""
    out = []
    for item, ratings in table.items():
        v = aiken_v(ratings, lo, hi)
        out.append({"butir": item, "n_ahli": len(ratings), "V": v, "kategori": category(v)})
    return out


def read_csv(path: str | Path) -> dict[str, list[float]]:
    """CSV: first column = butir/aspek, next columns = one column per expert (ahli1, ahli2, ...)."""
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    header, body = rows[0], rows[1:]
    if len(header) < 2:
        raise ValueError("Butuh kolom butir + minimal 1 kolom ahli.")
    return {r[0].strip(): [float(x) for x in r[1:] if x.strip()] for r in body if r and r[0].strip()}


def report(result: list[dict], lo: int = 1, hi: int = 5) -> str:
    lines = [f"# Validitas isi (Aiken's V, skala {lo}–{hi})", "", "| Butir/aspek | n ahli | V | Kategori |", "|---|---|---|---|"]
    for r in result:
        lines.append(f"| {r['butir']} | {r['n_ahli']} | {r['V']:.2f} | {r['kategori']} |")
    mean_v = sum(r["V"] for r in result) / len(result)
    lines += ["", f"- Rata-rata V: **{mean_v:.2f}** ({category(mean_v)})",
              "- Catatan: penilaian beberapa ahli menggambarkan kesepakatan, bukan bukti validitas empiris."]
    return "\n".join(lines) + "\n"
