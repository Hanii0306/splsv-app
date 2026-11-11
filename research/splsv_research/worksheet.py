"""Printable worksheet (pretest/posttest/latihan) with a worked answer key.

Items come from the same level generators as the app (engine.gen_equation), so a seed reproduces a sheet.
Note: the literacy pretest/posttest for the study must be a SEPARATE, validated instrument (prd.md §9);
use this for practice sheets or as a starting bank to be reviewed by experts.
"""

from __future__ import annotations

import html
from datetime import date

from .engine import gen_equation, pretty, solution_steps, solve

LEVEL_TITLES = {
    "L0": "Arti \"=\": seimbang", "L1": "Bentuk x + a = b", "L2": "Bentuk ax = b", "L3": "Bentuk ax + b = c",
    "L4": "Variabel di kedua ruas", "L5": "Tanda kurung", "L6": "Pecahan",
}


def make_items(levels: list[str], per_level: int, seed: int | str) -> list[dict]:
    items, seen = [], set()
    for lv in levels:
        k = 0
        while sum(1 for i in items if i["level"] == lv) < per_level and k < per_level * 20:
            text = gen_equation(lv, f"{seed}-{k}")
            k += 1
            if text in seen:
                continue
            seen.add(text)
            items.append({"level": lv, "equation": text, "answer": solve_text(text), "steps": solution_steps(text)})
    return items


def solve_text(text: str) -> str:
    from .engine import parse

    return f"x = {pretty(str(solve(parse(text))))}"


def to_markdown(items: list[dict], title: str) -> str:
    lines = [f"# {title}", "", "Nama/Kode: ____________   Kelas: ______   Tanggal: ______", "",
             "Selesaikan setiap persamaan. Tuliskan langkahmu: lakukan operasi yang SAMA pada kedua ruas.", ""]
    for n, it in enumerate(items, 1):
        lines.append(f"{n}. {pretty(it['equation'])}")
    lines += ["", "---", "", "## Kunci jawaban & pembahasan", ""]
    for n, it in enumerate(items, 1):
        lines.append(f"**{n}. {pretty(it['equation'])}** → {it['answer']}")
        for text, op in it["steps"][1:]:
            lines.append(f"   - {op}: {pretty(text)}")
    return "\n".join(lines) + "\n"


def to_html(items: list[dict], title: str) -> str:
    e = html.escape
    qs = "".join(f'<li><span class="eq">{e(pretty(it["equation"]))}</span><div class="work"></div></li>' for it in items)
    keys = "".join(
        f'<li><b>{e(pretty(it["equation"]))}</b> → <b>{e(it["answer"])}</b><ol class="steps">'
        + "".join(f"<li><i>{e(op)}</i>: {e(pretty(t))}</li>" for t, op in it["steps"][1:])
        + "</ol></li>"
        for it in items
    )
    return f"""<!doctype html><html lang="id"><head><meta charset="utf-8"><title>{e(title)}</title>
<style>
 body {{ font: 15px/1.5 system-ui, sans-serif; color: #2b1c2e; margin: 24px; }}
 h1 {{ color: #d63c7f; margin: 0 0 4px; }} .meta {{ border-bottom: 2px solid #f6bfd6; padding-bottom: 8px; margin-bottom: 12px; }}
 ol.qs > li {{ margin: 0 0 14px; break-inside: avoid; }} .eq {{ font: 600 18px ui-monospace, monospace; }}
 .work {{ height: 70px; border-bottom: 1px dashed #ccc; }} .key {{ page-break-before: always; }}
 ol.steps {{ color: #555; margin: 2px 0 10px; }} @media print {{ body {{ margin: 12mm; }} }}
</style></head><body>
<h1>{e(title)}</h1>
<div class="meta">Nama/Kode: ____________ &nbsp; Kelas: ______ &nbsp; Tanggal: ______<br>
Selesaikan setiap persamaan. Lakukan operasi yang <b>sama</b> pada kedua ruas, lalu cek jawabanmu.</div>
<ol class="qs">{qs}</ol>
<section class="key"><h2>Kunci jawaban &amp; pembahasan</h2><ol>{keys}</ol></section>
<p style="color:#888;font-size:12px">Dibuat {date.today():%d-%m-%Y} dengan splsv_research.</p>
</body></html>
"""
