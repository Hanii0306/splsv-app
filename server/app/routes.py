import csv
import io
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from .analytics import summarize_class
from .config import settings
from .db import get_session
from .models import ClassRoom, Event, Progress, Student, Teacher
from .schemas import (
    CreateClassIn,
    CreateClassOut,
    EventBatchIn,
    EventBatchOut,
    JoinIn,
    ProgressBatchIn,
    TeacherLoginIn,
    TokenOut,
)
from .hardening import client_ip, login_blocked, login_failed, login_ok, rate_limit, too_many, LOGIN_WINDOW
from .security import (
    hash_pin,
    make_token,
    require_admin,
    require_student,
    require_teacher,
    verify_pin,
)

router = APIRouter(prefix="/api/v1")


def admin_enabled() -> None:
    if not settings.admin_api:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not Found")



def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------- admin (peneliti)
@router.post("/admin/classes", response_model=CreateClassOut, dependencies=[Depends(admin_enabled), Depends(rate_limit("admin", 20, 600)), Depends(require_admin)])
def create_class(body: CreateClassIn, db: Session = Depends(get_session)):
    code = body.code.upper()
    if db.get(ClassRoom, code):
        raise HTTPException(status.HTTP_409_CONFLICT, "Kode kelas sudah ada")

    email = body.teacher_email.strip().lower()
    teacher = db.exec(select(Teacher).where(Teacher.email == email)).first()
    if teacher is None:
        teacher = Teacher(email=email, pin_hash=hash_pin(body.teacher_pin))
        db.add(teacher)
        db.flush()

    db.add(ClassRoom(code=code, name=body.name, teacher_id=teacher.id))
    for sc in body.student_codes:
        db.add(Student(class_code=code, code=sc))
    db.commit()
    return CreateClassOut(code=code, name=body.name, teacher_email=email, student_codes=body.student_codes)


@router.get("/admin/classes/{code}/export", dependencies=[Depends(admin_enabled), Depends(rate_limit("admin", 20, 600)), Depends(require_admin)])
def admin_export(code: str, format: str = Query("json", pattern="^(json|csv)$"), db: Session = Depends(get_session)):
    return _export(code.upper(), format, db)


# ---------------------------------------------------------------- siswa
@router.post("/classes/{code}/join", response_model=TokenOut, response_model_by_alias=True,
             dependencies=[Depends(rate_limit("join", 10, 600))])
def join_class(code: str, body: JoinIn, db: Session = Depends(get_session)):
    code = code.upper()
    sc = body.student_code.upper()
    student = db.exec(select(Student).where(Student.class_code == code, Student.code == sc)).first()
    if student is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kode kelas atau kode siswa tidak terdaftar")
    if student.joined_at is None:
        student.joined_at = _now()
        db.add(student)
        db.commit()
    token = make_token("student", sc, cls=code)
    return TokenOut(token=token, class_code=code, student_code=sc)


@router.post("/events:batch", response_model=EventBatchOut, dependencies=[Depends(rate_limit("events", 120, 60))])
def upload_events(body: EventBatchIn, claims: dict = Depends(require_student), db: Session = Depends(get_session)):
    code, sc = claims["cls"], claims["sub"]
    ids = [e.client_event_id for e in body.events]
    existing = set(db.exec(select(Event.client_event_id).where(Event.client_event_id.in_(ids))).all()) if ids else set()

    accepted = 0
    seen: set[str] = set()
    for e in body.events:
        if e.client_event_id in existing or e.client_event_id in seen:
            continue
        seen.add(e.client_event_id)
        db.add(
            Event(
                client_event_id=e.client_event_id,
                class_code=code,
                student_code=sc,
                session_id=e.session_id,
                ts=e.ts,
                type=e.type,
                item_id=e.item_id,
                payload=json.dumps(e.payload, ensure_ascii=False),
            )
        )
        accepted += 1

    student = db.exec(select(Student).where(Student.class_code == code, Student.code == sc)).first()
    if student:
        student.last_sync_at = _now()
        db.add(student)
    try:
        db.commit()
    except IntegrityError:  # concurrent duplicate upload: safe to ignore
        db.rollback()
        return EventBatchOut(accepted=0, duplicates=len(body.events))
    return EventBatchOut(accepted=accepted, duplicates=len(body.events) - accepted)


_STATUS_RANK = {"locked": 0, "active": 1, "mastered": 2}


@router.put("/progress", dependencies=[Depends(rate_limit("progress", 120, 60))])
def put_progress(body: ProgressBatchIn, claims: dict = Depends(require_student), db: Session = Depends(get_session)):
    """Merge rule (architecture.md §3.11): keep the best status and best streak."""
    code, sc = claims["cls"], claims["sub"]
    for item in body.items:
        row = db.exec(
            select(Progress).where(
                Progress.class_code == code, Progress.student_code == sc, Progress.level_id == item.level_id
            )
        ).first()
        if row is None:
            row = Progress(class_code=code, student_code=sc, level_id=item.level_id)
        if _STATUS_RANK[item.status] > _STATUS_RANK[row.status]:
            row.status = item.status
        row.best_streak = max(row.best_streak, item.best_streak)
        row.updated_at = _now()
        db.add(row)
    db.commit()
    return {"ok": True}


@router.get("/progress")
def get_progress(claims: dict = Depends(require_student), db: Session = Depends(get_session)):
    rows = db.exec(
        select(Progress).where(Progress.class_code == claims["cls"], Progress.student_code == claims["sub"])
    ).all()
    return {"items": [{"levelId": r.level_id, "status": r.status, "bestStreak": r.best_streak} for r in rows]}


@router.get("/content/version")
def content_version():
    return {"contentVersion": settings.content_version, "minAppVersion": settings.min_app_version}


# ---------------------------------------------------------------- guru
@router.post("/teacher/login")
def teacher_login(body: TeacherLoginIn, request: Request, db: Session = Depends(get_session)):
    email = body.email.strip().lower()
    ip = client_ip(request)
    if login_blocked(ip, email):
        raise too_many(LOGIN_WINDOW)
    teacher = db.exec(select(Teacher).where(Teacher.email == email)).first()
    if teacher is None or not verify_pin(body.pin, teacher.pin_hash):
        login_failed(ip, email)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email atau PIN salah")
    login_ok(email)
    return {"token": make_token("teacher", str(teacher.id)), "email": teacher.email}


def _owned_class(code: str, claims: dict, db: Session) -> ClassRoom:
    cls = db.get(ClassRoom, code.upper())
    # 404 for both "missing" and "not yours" so class codes cannot be probed.
    if cls is None or str(cls.teacher_id) != claims["sub"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kelas tidak ditemukan")
    return cls


@router.get("/teacher/classes")
def teacher_classes(claims: dict = Depends(require_teacher), db: Session = Depends(get_session)):
    rows = db.exec(select(ClassRoom).where(ClassRoom.teacher_id == int(claims["sub"]))).all()
    out = []
    for c in rows:
        n = len(db.exec(select(Student.id).where(Student.class_code == c.code)).all())
        out.append({"code": c.code, "name": c.name, "studentCount": n})
    return {"classes": out}


@router.get("/classes/{code}/summary")
def class_summary(code: str, claims: dict = Depends(require_teacher), db: Session = Depends(get_session)):
    cls = _owned_class(code, claims, db)
    students = db.exec(select(Student).where(Student.class_code == cls.code)).all()
    events = db.exec(select(Event).where(Event.class_code == cls.code)).all()
    progress = db.exec(select(Progress).where(Progress.class_code == cls.code)).all()
    return {"code": cls.code, "name": cls.name, **summarize_class(students, events, progress)}


@router.get("/classes/{code}/export")
def teacher_export(
    code: str,
    format: str = Query("csv", pattern="^(json|csv)$"),
    claims: dict = Depends(require_teacher),
    db: Session = Depends(get_session),
):
    cls = _owned_class(code, claims, db)
    return _export(cls.code, format, db)


def _export(code: str, fmt: str, db: Session) -> Response:
    events = db.exec(select(Event).where(Event.class_code == code).order_by(Event.student_code, Event.ts)).all()
    cols = ["student_code", "session_id", "ts", "type", "item_id", "payload"]
    if fmt == "json":
        data = [{c: getattr(e, c) for c in cols} for e in events]
        for d in data:
            d["payload"] = json.loads(d["payload"])
        return Response(json.dumps(data, ensure_ascii=False), media_type="application/json")
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(cols)
    for e in events:
        w.writerow([getattr(e, c) for c in cols])
    return Response(
        buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{code}-events.csv"'},
    )
