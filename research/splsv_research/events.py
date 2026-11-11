"""Read learning-event exports from the app (menu peneliti → CSV/JSON) or the server
(dashboard → Unduh CSV) and summarise them per student (task T-E02, T-E03)."""

from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from pathlib import Path
from statistics import fmean, median

ERROR_LABELS = {
    "invalid_sign": "Tanda / pindah ruas",
    "invalid_one_side": "Hanya satu ruas",
    "invalid_arithmetic": "Salah hitung",
    "modeling": "Pemodelan soal cerita",
}

# app export uses camelCase, server export uses snake_case
_ALIASES = {"studentCode": "student_code", "sessionId": "session_id", "itemId": "item_id"}


def _norm(row: dict) -> dict:
    r = {_ALIASES.get(k, k): v for k, v in row.items()}
    p = r.get("payload")
    if isinstance(p, str):
        try:
            r["payload"] = json.loads(p) if p.strip() else {}
        except json.JSONDecodeError:
            r["payload"] = {}
    r["ts"] = int(float(r.get("ts") or 0))
    return r


def load(path: str | Path) -> list[dict]:
    path = Path(path)
    if path.suffix.lower() == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        return [_norm(r) for r in data]
    with open(path, newline="", encoding="utf-8-sig") as f:
        return [_norm(r) for r in csv.DictReader(f)]


def summarise(events: list[dict]) -> list[dict]:
    """One row per student code: activity, errors by type, hints, timing, why-accuracy, mastered levels."""
    by: dict[str, list[dict]] = defaultdict(list)
    for e in events:
        by[e.get("student_code", "?")].append(e)

    rows = []
    for code in sorted(by, key=lambda c: (len(c), c)):
        evs = by[code]
        p = lambda e: e.get("payload") or {}  # noqa: E731
        steps = [e for e in evs if e["type"] == "step"]
        errors = Counter(p(e).get("result") for e in steps if p(e).get("result") in ERROR_LABELS)
        errors["modeling"] += sum(1 for e in evs if e["type"] == "story_cards" and p(e).get("ok") is False)
        hints = [p(e).get("level", 0) for e in evs if e["type"] == "hint_opened"]
        step_ms = [p(e).get("ms") for e in steps if isinstance(p(e).get("ms"), (int, float))]
        why = [bool(p(e).get("correct")) for e in evs if e["type"] == "why_answer"]
        items = [e for e in evs if e["type"] == "item_complete" and p(e).get("kind") not in ("level", "interpret")]
        mastered = sorted({p(e).get("levelId") for e in evs if e["type"] == "item_complete" and p(e).get("kind") == "level" and p(e).get("mastered")})
        quiz = [bool(p(e).get("correct")) for e in evs if e["type"] == "quiz_answer"]
        sessions = {e.get("session_id") for e in evs}
        rows.append({
            "kode": code,
            "sesi": len(sessions),
            "aktivitas": len(evs),
            "soal_selesai": len(items),
            "langkah": len(steps),
            **{f"salah_{k}": errors.get(k, 0) for k in ERROR_LABELS},
            "kesalahan_dominan": ERROR_LABELS[errors.most_common(1)[0][0]] if errors and errors.most_common(1)[0][1] else "-",
            "hint_dibuka": len(hints),
            "hint_H3_H4": sum(1 for h in hints if h >= 3),
            "median_detik_per_langkah": round(median(step_ms) / 1000, 1) if step_ms else None,
            "ketepatan_mengapa": round(fmean(why), 2) if why else None,
            "skor_kuis": round(fmean(quiz) * 100) if quiz else None,
            "level_dikuasai": " ".join(mastered),
        })
    return rows


def write_csv(rows: list[dict], path: str | Path) -> None:
    if not rows:
        Path(path).write_text("", encoding="utf-8")
        return
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


def class_errors(rows: list[dict]) -> dict[str, int]:
    return {ERROR_LABELS[k]: sum(r[f"salah_{k}"] for r in rows) for k in ERROR_LABELS}


def report(rows: list[dict]) -> str:
    lines = ["# Ringkasan log belajar", "", f"Jumlah siswa: **{len(rows)}**", "", "## Kesalahan di kelas", ""]
    for label, n in class_errors(rows).items():
        lines.append(f"- {label}: {n}")
    lines += ["", "## Per siswa", "", "| Kode | Soal | Kesalahan dominan | Hint (H3/H4) | Detik/langkah | Mengapa ✓ | Level dikuasai |", "|---|---|---|---|---|---|---|"]
    for r in rows:
        why = "–" if r["ketepatan_mengapa"] is None else f"{r['ketepatan_mengapa'] * 100:.0f}%"
        sec = "–" if r["median_detik_per_langkah"] is None else r["median_detik_per_langkah"]
        lines.append(f"| {r['kode']} | {r['soal_selesai']} | {r['kesalahan_dominan']} | {r['hint_dibuka']} ({r['hint_H3_H4']}) | {sec} | {why} | {r['level_dikuasai'] or '–'} |")
    lines += ["", "Log adalah bahan triangulasi proses belajar, bukan ukuran langsung beban kognitif (prd.md §9)."]
    return "\n".join(lines) + "\n"
