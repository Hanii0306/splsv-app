"""N-gain (Hake, 1998) for pretest/posttest of mathematical literacy (prd.md §9, task T-E01)."""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from statistics import fmean

from .stats import describe, paired_t


def ngain(pre: float, post: float, max_score: float = 100) -> float | None:
    """g = (post − pre) / (max − pre); None when pre already equals the maximum."""
    if max_score - pre == 0:
        return None
    return (post - pre) / (max_score - pre)


def category(g: float | None) -> str:
    """Hake's categories: tinggi (g ≥ 0,7), sedang (0,3 ≤ g < 0,7), rendah (g < 0,3)."""
    if g is None:
        return "tidak dapat dihitung"
    if g >= 0.7:
        return "tinggi"
    if g >= 0.3:
        return "sedang"
    return "rendah"


@dataclass
class Row:
    code: str
    pre: float
    post: float
    g: float | None
    category: str


def analyse(rows: list[tuple[str, float, float]], max_score: float = 100) -> dict:
    """rows = [(student_code, pretest, posttest), ...] → per-student g + class summary + paired t-test."""
    out = []
    for code, pre, post in rows:
        g = ngain(pre, post, max_score)
        out.append(Row(code, pre, post, g, category(g)))
    gs = [r.g for r in out if r.g is not None]
    mean_g = fmean(gs) if gs else None
    # Class N-gain from mean scores (Hake's <g>) as well as the mean of individual gains.
    mean_pre, mean_post = fmean(r.pre for r in out), fmean(r.post for r in out)
    class_g = ngain(mean_pre, mean_post, max_score)
    counts = {c: sum(1 for r in out if r.category == c) for c in ("tinggi", "sedang", "rendah")}
    return {
        "rows": out,
        "pre": describe([r.pre for r in out]),
        "post": describe([r.post for r in out]),
        "mean_individual_g": mean_g,
        "class_g": class_g,
        "class_category": category(class_g),
        "counts": counts,
        "paired_t": paired_t([r.pre for r in out], [r.post for r in out]) if len(out) >= 2 else None,
    }


def read_csv(path: str | Path) -> list[tuple[str, float, float]]:
    """CSV with columns: kode, pretest, posttest (header names are case-insensitive)."""
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        cols = {c.lower().strip(): c for c in reader.fieldnames or []}
        need = ("kode", "pretest", "posttest")
        if not all(c in cols for c in need):
            raise ValueError(f"Kolom wajib: {', '.join(need)} (ditemukan: {', '.join(reader.fieldnames or [])})")
        return [(r[cols["kode"]].strip(), float(r[cols["pretest"]]), float(r[cols["posttest"]])) for r in reader]


def report(result: dict) -> str:
    lines = ["# Analisis N-gain literasi matematis", "", "| Kode | Pretest | Posttest | N-gain | Kategori |", "|---|---|---|---|---|"]
    for r in result["rows"]:
        g = "–" if r.g is None else f"{r.g:.2f}"
        lines.append(f"| {r.code} | {r.pre:g} | {r.post:g} | {g} | {r.category} |")
    pre, post = result["pre"], result["post"]
    lines += [
        "",
        f"- Rata-rata pretest: **{pre['mean']:.2f}** (SD {pre['sd']:.2f}); posttest: **{post['mean']:.2f}** (SD {post['sd']:.2f})",
        f"- N-gain kelas ⟨g⟩: **{result['class_g']:.2f}** → kategori **{result['class_category']}**",
        f"- Rata-rata N-gain individu: {result['mean_individual_g']:.2f}",
        f"- Sebaran kategori: tinggi {result['counts']['tinggi']}, sedang {result['counts']['sedang']}, rendah {result['counts']['rendah']}",
    ]
    t = result["paired_t"]
    if t:
        p_txt = "p < 0,001" if t["p"] < 0.001 else f"p = {t['p']:.4f}"
        lines.append(f"- Uji-t berpasangan: t({t['df']}) = {t['t']:.3f}, {p_txt} "
                     f"({'signifikan' if t['p'] < 0.05 else 'tidak signifikan'} pada α = 0,05)")
        lines.append("- Catatan: periksa normalitas selisih skor; bila tidak normal gunakan uji Wilcoxon.")
    return "\n".join(lines) + "\n"
