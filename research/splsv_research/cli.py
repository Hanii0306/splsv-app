"""Command line for the research tools.

    python -m splsv_research ngain  contoh/nilai.csv            [--max 100] [--out laporan.md]
    python -m splsv_research aiken  contoh/validasi.csv         [--lo 1 --hi 5]
    python -m splsv_research log    ekspor.csv                  [--csv ringkasan.csv]
    python -m splsv_research beban  ekspor.csv
    python -m splsv_research soal   --level L3 L4 --n 5 --seed 7 --out lembar.html
    python -m splsv_research selesaikan "3(x - 2) = 12"
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import aiken, cognitive_load, events, ngain, worksheet
from .engine import LEVELS, pretty, solution_steps


def _emit(text: str, out: str | None) -> None:
    if out:
        Path(out).write_text(text, encoding="utf-8")
        print(f"Tersimpan: {out}")
    else:
        sys.stdout.reconfigure(encoding="utf-8")
        print(text)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="splsv_research", description="Alat analisis penelitian SPLSV app")
    sub = p.add_subparsers(dest="cmd", required=True)

    a = sub.add_parser("ngain", help="N-gain + uji-t berpasangan dari CSV kode,pretest,posttest")
    a.add_argument("csv"); a.add_argument("--max", type=float, default=100); a.add_argument("--out")

    a = sub.add_parser("aiken", help="Aiken's V dari CSV butir,ahli1,ahli2,...")
    a.add_argument("csv"); a.add_argument("--lo", type=int, default=1); a.add_argument("--hi", type=int, default=5); a.add_argument("--out")

    a = sub.add_parser("log", help="Ringkasan log belajar per siswa (ekspor aplikasi/server)")
    a.add_argument("file"); a.add_argument("--csv", help="simpan ringkasan sebagai CSV"); a.add_argument("--out")

    a = sub.add_parser("beban", help="Skor beban kognitif IL/EL/GL + Paas dari ekspor")
    a.add_argument("file"); a.add_argument("--out")

    a = sub.add_parser("soal", help="Lembar soal + kunci jawaban (HTML/Markdown)")
    a.add_argument("--level", nargs="+", default=["L1", "L2", "L3", "L4"], choices=LEVELS)
    a.add_argument("--n", type=int, default=3, help="soal per level"); a.add_argument("--seed", default="1")
    a.add_argument("--judul", default="Latihan Persamaan Linear Satu Variabel"); a.add_argument("--out")

    a = sub.add_parser("selesaikan", help="Tampilkan langkah penyelesaian satu persamaan")
    a.add_argument("persamaan")

    args = p.parse_args(argv)

    if args.cmd == "ngain":
        _emit(ngain.report(ngain.analyse(ngain.read_csv(args.csv), args.max)), args.out)
    elif args.cmd == "aiken":
        _emit(aiken.report(aiken.analyse(aiken.read_csv(args.csv), args.lo, args.hi), args.lo, args.hi), args.out)
    elif args.cmd == "log":
        rows = events.summarise(events.load(args.file))
        if args.csv:
            events.write_csv(rows, args.csv)
            print(f"Tersimpan: {args.csv}")
        _emit(events.report(rows), args.out)
    elif args.cmd == "beban":
        _emit(cognitive_load.report(cognitive_load.responses(events.load(args.file))), args.out)
    elif args.cmd == "soal":
        items = worksheet.make_items(args.level, args.n, args.seed)
        out = args.out
        text = worksheet.to_html(items, args.judul) if out and out.endswith(".html") else worksheet.to_markdown(items, args.judul)
        _emit(text, out)
    elif args.cmd == "selesaikan":
        sys.stdout.reconfigure(encoding="utf-8")
        for text, op in solution_steps(args.persamaan):
            print(f"  ↓ {op}" if op else "", end="\n" if op else "")
            print(pretty(text))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
