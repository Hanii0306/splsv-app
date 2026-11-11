import csv
import json
from fractions import Fraction

import pytest

from splsv_research import aiken, cognitive_load, events, ngain, worksheet
from splsv_research.cli import main
from splsv_research.engine import (
    LEVELS, ParseError, apply, best_op, gen_equation, is_solved, parse, solution_steps, solve,
)
from splsv_research.stats import cronbach_alpha, paired_t


# ---------------------------------------------------------------- engine (parity with app/src/engine)
@pytest.mark.parametrize("text, x", [
    ("2x + 5 = 15", 5), ("-2x = 8", -4), ("3(x - 2) = 12", 6), ("1/2(x + 3) = 5", 7),
    ("x/3 + 2 = 6", 12), ("2/3x = 8", 12), ("5x − 3 = 2x + 9", 4), ("-2(x - 3) = 10", -2),
    ("x + (x + 1) + (x + 2) = 45", 14),
])
def test_solve(text, x):
    assert solve(parse(text)) == Fraction(x)


def test_structure_and_errors():
    assert parse("3(x - 2) = 12").left.structured
    assert not parse("2x + 5 = 15").left.structured
    assert not parse("x/3 + 2 = 6").left.structured
    assert solve(parse("x + 1 = x + 2")) == "none"
    assert solve(parse("2(x + 1) = 2x + 2")) == "all"
    with pytest.raises(ParseError):
        parse("x * x = 4")
    with pytest.raises(ParseError):
        parse("2x + 1")


def test_steps_match_the_app_order():
    steps = solution_steps("2x + 5 = 15")
    assert [s for s, _ in steps] == ["2x + 5 = 15", "2x = 10", "x = 5"]
    assert steps[1][1] == "−5 kedua ruas" and steps[2][1] == "÷2 kedua ruas"
    assert solution_steps("3(x - 2) = 12")[1][1] == "Jabarkan / sederhanakan"
    assert solution_steps("5x - 3 = 2x + 9")[1][0] == "3x - 3 = 9"


def test_inequality_flips_on_negative_divisor():
    eq = parse("-2x < 8")
    assert str(apply(eq, best_op(eq))) == "x > -4"


@pytest.mark.parametrize("level", LEVELS)
def test_generators(level):
    seen = set()
    for s in range(300):
        text = gen_equation(level, s)
        seen.add(text)
        sol = solve(parse(text))
        assert isinstance(sol, Fraction) and sol.denominator == 1, text
        steps = solution_steps(text)
        assert is_solved(parse(steps[-1][0])), text
        assert len(steps) <= 7, text
    assert len(seen) > 40
    assert gen_equation(level, 5) == gen_equation(level, 5)


# ---------------------------------------------------------------- statistics
def test_paired_t_known_value():
    r = paired_t([1, 2, 3, 4, 5], [2, 4, 5, 6, 8])
    assert r["df"] == 4
    assert r["t"] == pytest.approx(6.3246, abs=1e-3)
    assert r["p"] == pytest.approx(0.00321, abs=2e-4)  # matches scipy.stats.ttest_rel


def test_cronbach_alpha_known_value():
    items = [[2, 3, 3, 4, 5], [3, 3, 4, 4, 5], [2, 4, 3, 5, 5]]
    assert cronbach_alpha(items) == pytest.approx(0.9158, abs=1e-3)  # 1.5 × (1 − 3.7 / 9.5)


def test_ngain():
    assert ngain.ngain(40, 82) == pytest.approx(0.7)
    assert ngain.category(0.7) == "tinggi" and ngain.category(0.5) == "sedang" and ngain.category(0.1) == "rendah"
    assert ngain.ngain(100, 100) is None
    res = ngain.analyse([("S01", 40, 80), ("S02", 50, 70), ("S03", 30, 80)])  # g = 0.67, 0.40, 0.71
    assert res["counts"]["sedang"] == 2 and res["counts"]["tinggi"] == 1
    assert res["paired_t"]["t"] == pytest.approx(4.157, abs=1e-2)  # diffs 40, 20, 50
    assert res["paired_t"]["p"] == pytest.approx(0.0533, abs=1e-3)  # n = 3 → not significant
    assert "N-gain kelas" in ngain.report(res)


def test_aiken():
    assert aiken.aiken_v([4, 5, 5]) == pytest.approx(11 / 12)
    assert aiken.category(0.9) == "tinggi (valid)"
    with pytest.raises(ValueError):
        aiken.aiken_v([6])


# ---------------------------------------------------------------- app exports
def _events():
    ev = []
    def add(code, i, type_, **payload):
        ev.append({"studentCode": code, "sessionId": "s1", "ts": 1000 + i, "type": type_, "itemId": "L3-P1", "payload": json.dumps(payload)})
    add("S01", 1, "step", result="invalid_sign", ms=8000)
    add("S01", 2, "step", result="invalid_sign", ms=6000)
    add("S01", 3, "step", result="valid_progress", ms=4000)
    add("S01", 4, "hint_opened", level=3, levelId="L3")
    add("S01", 5, "why_answer", correct=True)
    add("S01", 6, "item_complete", levelId="L3", wrongs=2, maxHint=3)
    add("S01", 7, "item_complete", kind="level", levelId="L3", mastered=True)
    add("S02", 8, "story_cards", ok=False)
    add("S02", 9, "cl_questionnaire", levelId="L3", answers={"IL1": 5, "IL2": 4, "EL1": 2, "EL2": 2, "EL3": 3, "GL1": 6, "GL2": 6, "PAAS": 6})
    add("S01", 10, "cl_questionnaire", levelId="L3", answers={"IL1": 4, "IL2": 4, "EL1": 3, "EL2": 1, "EL3": 2, "GL1": 7, "GL2": 6, "PAAS": 5})
    return ev


def _write_app_csv(path, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["studentCode", "sessionId", "ts", "type", "itemId", "payload"])
        w.writeheader()
        w.writerows(rows)


def test_events_summary(tmp_path):
    p = tmp_path / "ekspor.csv"
    _write_app_csv(p, _events())
    rows = events.summarise(events.load(p))
    s1 = next(r for r in rows if r["kode"] == "S01")
    assert s1["salah_invalid_sign"] == 2 and s1["kesalahan_dominan"] == "Tanda / pindah ruas"
    assert s1["hint_H3_H4"] == 1 and s1["ketepatan_mengapa"] == 1.0 and s1["level_dikuasai"] == "L3"
    assert s1["median_detik_per_langkah"] == 6.0
    s2 = next(r for r in rows if r["kode"] == "S02")
    assert s2["salah_modeling"] == 1


def test_server_json_export(tmp_path):
    data = [{"student_code": "S05", "session_id": "a", "ts": 1, "type": "step", "item_id": "L1-P1", "payload": {"result": "invalid_one_side"}}]
    p = tmp_path / "server.json"
    p.write_text(json.dumps(data), encoding="utf-8")
    assert events.summarise(events.load(p))[0]["salah_invalid_one_side"] == 1


def test_cognitive_load():
    rows = cognitive_load.responses([events._norm(e) for e in _events()])
    assert len(rows) == 2
    s2 = next(r for r in rows if r["kode"] == "S02")
    assert s2["IL"] == 4.5 and s2["EL"] == pytest.approx(2.33, abs=0.01) and s2["GL"] == 6 and s2["PAAS"] == 6
    assert "Beban kognitif" in cognitive_load.report(rows)


# ---------------------------------------------------------------- worksheet + CLI
def test_worksheet(tmp_path):
    items = worksheet.make_items(["L2", "L3"], 4, seed=3)
    assert len(items) == 8 and len({i["equation"] for i in items}) == 8
    html_text = worksheet.to_html(items, "Lembar Latihan")
    assert "Kunci jawaban" in html_text and items[0]["answer"] in html_text
    assert worksheet.make_items(["L3"], 3, 9) == worksheet.make_items(["L3"], 3, 9)


def test_cli_end_to_end(tmp_path, capsys):
    nilai = tmp_path / "nilai.csv"
    nilai.write_text("kode,pretest,posttest\nS01,40,80\nS02,50,70\n", encoding="utf-8")
    assert main(["ngain", str(nilai)]) == 0
    assert "N-gain" in capsys.readouterr().out
    val = tmp_path / "validasi.csv"
    val.write_text("butir,ahli1,ahli2,ahli3\nKesesuaian materi,4,5,5\n", encoding="utf-8")
    assert main(["aiken", str(val), "--out", str(tmp_path / "v.md")]) == 0
    assert "0.92" in (tmp_path / "v.md").read_text(encoding="utf-8")
    assert main(["soal", "--level", "L1", "--n", "2", "--out", str(tmp_path / "s.html")]) == 0
    assert (tmp_path / "s.html").read_text(encoding="utf-8").startswith("<!doctype html>")
    assert main(["selesaikan", "2x + 5 = 15"]) == 0
    assert "x = 5" in capsys.readouterr().out
