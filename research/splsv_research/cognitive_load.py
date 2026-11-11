"""Cognitive-load questionnaire scores (IL / EL / GL + Paas) from the app's `cl_questionnaire` events.

Item ids follow app/src/content/clq.json: IL1–IL2, EL1–EL3, GL1–GL2 on a 1–7 scale, PAAS on 1–9.
The adapted items still need expert validation for SMP students (task T-D07); alpha from a small
class is descriptive only.
"""

from __future__ import annotations

from collections import defaultdict
from statistics import fmean

from .stats import cronbach_alpha, describe

SUBSCALES = {"IL": ("IL1", "IL2"), "EL": ("EL1", "EL2", "EL3"), "GL": ("GL1", "GL2")}


def responses(events: list[dict]) -> list[dict]:
    """Latest questionnaire per student and level → [{kode, levelId, IL, EL, GL, PAAS, items}]."""
    latest: dict[tuple[str, str], dict] = {}
    for e in sorted(events, key=lambda e: e.get("ts", 0)):
        if e.get("type") != "cl_questionnaire":
            continue
        p = e.get("payload") or {}
        answers = p.get("answers") or {}
        latest[(e.get("student_code", "?"), p.get("levelId", "?"))] = answers
    out = []
    for (code, level), a in latest.items():
        row = {"kode": code, "level": level, "items": a}
        for name, ids in SUBSCALES.items():
            vals = [a[i] for i in ids if isinstance(a.get(i), (int, float))]
            row[name] = round(fmean(vals), 2) if vals else None
        row["PAAS"] = a.get("PAAS")
        out.append(row)
    return out


def summary(rows: list[dict]) -> dict:
    res = {}
    for name in (*SUBSCALES, "PAAS"):
        vals = [r[name] for r in rows if isinstance(r.get(name), (int, float))]
        res[name] = describe(vals) if vals else None
    alphas = {}
    for name, ids in SUBSCALES.items():
        complete = [r["items"] for r in rows if all(isinstance(r["items"].get(i), (int, float)) for i in ids)]
        if len(complete) >= 2:
            try:
                alphas[name] = cronbach_alpha([[c[i] for c in complete] for i in ids])
            except ValueError:
                alphas[name] = None
    res["alpha"] = alphas
    return res


def by_level(rows: list[dict]) -> dict[str, dict[str, float]]:
    acc: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for r in rows:
        for name in (*SUBSCALES, "PAAS"):
            if isinstance(r.get(name), (int, float)):
                acc[r["level"]][name].append(r[name])
    return {lv: {k: round(fmean(v), 2) for k, v in d.items()} for lv, d in sorted(acc.items())}


def report(rows: list[dict]) -> str:
    s = summary(rows)
    lines = ["# Beban kognitif (kuesioner dalam aplikasi)", "", f"Jumlah respons: **{len(rows)}**", "",
             "| Skala | n | Rata-rata | SD | Min | Maks | α Cronbach |", "|---|---|---|---|---|---|---|"]
    for name in (*SUBSCALES, "PAAS"):
        d = s[name]
        if not d:
            continue
        a = s["alpha"].get(name)
        a_txt = "–" if a is None else f"{a:.2f}"
        lines.append(f"| {name} | {d['n']} | {d['mean']:.2f} | {d['sd']:.2f} | {d['min']:g} | {d['max']:g} | {a_txt} |")
    lines += ["", "## Per level", "", "| Level | IL | EL | GL | Paas |", "|---|---|---|---|---|"]
    for lv, d in by_level(rows).items():
        lines.append(f"| {lv} | {d.get('IL', '–')} | {d.get('EL', '–')} | {d.get('GL', '–')} | {d.get('PAAS', '–')} |")
    lines += ["", "IL/EL/GL skala 1–7 (EL rendah = penyajian tidak membebani); Paas skala 1–9.",
              "Butir masih adaptasi dan wajib divalidasi ahli; α dari sampel kecil hanya deskriptif."]
    return "\n".join(lines) + "\n"
