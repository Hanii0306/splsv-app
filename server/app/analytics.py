"""Turn raw learning events into the teacher dashboard summary (prd.md F12)."""

import json
from collections import Counter, defaultdict

from .models import Event, Progress, Student

ERROR_LABELS = {
    "invalid_sign": "Tanda / pindah ruas",
    "invalid_one_side": "Hanya satu ruas",
    "invalid_arithmetic": "Salah hitung",
    "modeling": "Pemodelan soal cerita",
}
STUCK_HINT_LEVEL = 3  # H3/H4
STUCK_MIN_COUNT = 3


def _payload(e: Event) -> dict:
    try:
        return json.loads(e.payload or "{}")
    except json.JSONDecodeError:
        return {}


def error_kind(e: Event) -> str | None:
    p = _payload(e)
    if e.type == "step":
        r = p.get("result")
        return r if r in ERROR_LABELS else None
    if e.type == "story_cards" and p.get("ok") is False:
        return "modeling"
    return None


def summarize_class(students: list[Student], events: list[Event], progress: list[Progress]) -> dict:
    by_student: dict[str, list[Event]] = defaultdict(list)
    for e in events:
        by_student[e.student_code].append(e)

    prog_by_student: dict[str, dict[str, dict]] = defaultdict(dict)
    for p in progress:
        prog_by_student[p.student_code][p.level_id] = {"status": p.status, "bestStreak": p.best_streak}

    class_errors: Counter[str] = Counter()
    rows = []
    for s in sorted(students, key=lambda s: s.code):
        evs = by_student.get(s.code, [])
        errors: Counter[str] = Counter(k for e in evs if (k := error_kind(e)))
        class_errors.update(errors)

        heavy_hints: Counter[str] = Counter()
        for e in evs:
            if e.type == "hint_opened" and _payload(e).get("level", 0) >= STUCK_HINT_LEVEL:
                heavy_hints[_payload(e).get("levelId") or (e.item_id or "?").split("-")[0]] += 1
        stuck_levels = sorted(lvl for lvl, n in heavy_hints.items() if n >= STUCK_MIN_COUNT)

        diag: dict[str, list[int]] = defaultdict(lambda: [0, 0])
        for e in evs:
            if e.type == "diagnostic_answer":
                p = _payload(e)
                skill = p.get("skill", "?")
                diag[skill][1] += 1
                diag[skill][0] += 1 if p.get("correct") else 0

        why = [e for e in evs if e.type == "why_answer"]
        rows.append(
            {
                "studentCode": s.code,
                "joined": s.joined_at is not None,
                "lastSyncAt": s.last_sync_at.isoformat() if s.last_sync_at else None,
                "levels": prog_by_student.get(s.code, {}),
                "errors": dict(errors),
                "dominantError": errors.most_common(1)[0][0] if errors else None,
                "stuckLevels": stuck_levels,
                "diagnostic": {k: {"correct": v[0], "total": v[1]} for k, v in diag.items()},
                "whyCorrectRate": (
                    round(sum(1 for e in why if _payload(e).get("correct")) / len(why), 2) if why else None
                ),
                "eventCount": len(evs),
            }
        )

    return {
        "errorLabels": ERROR_LABELS,
        "classErrors": dict(class_errors),
        "students": rows,
    }
