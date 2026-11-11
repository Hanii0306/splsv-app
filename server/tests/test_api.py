import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, create_engine

from app import db as db_module
from app.config import settings
from app.main import app

ADMIN = {"X-Admin-Key": settings.admin_key}


@pytest.fixture()
def client(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    monkeypatch.setattr(db_module, "engine", engine)
    db_module.init_db(engine)

    def _session():
        with Session(engine) as s:
            yield s

    app.dependency_overrides[db_module.get_session] = _session
    from app.hardening import limiter
    limiter.reset()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def make_class(client, code="VIIA", email="guru@a.id", pin="246810", students=("S01", "S02")):
    r = client.post("/api/v1/admin/classes", headers=ADMIN, json={
        "code": code, "name": code, "teacher_email": email, "teacher_pin": pin, "student_codes": list(students)})
    assert r.status_code == 200, r.text
    return r.json()


def join(client, code="VIIA", sc="S01"):
    r = client.post(f"/api/v1/classes/{code}/join", json={"studentCode": sc})
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["token"]}


def teacher(client, email="guru@a.id", pin="246810"):
    r = client.post("/api/v1/teacher/login", json={"email": email, "pin": pin})
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["token"]}


def ev(i, type_="step", **payload):
    return {"clientEventId": f"evt-{i:08d}", "sessionId": "sess-1", "ts": 1_700_000_000_000 + i,
            "type": type_, "itemId": "L2-P1", "payload": payload}


def test_admin_requires_key(client):
    r = client.post("/api/v1/admin/classes", json={})
    assert r.status_code == 401


def test_join_unknown_code_404(client):
    make_class(client)
    assert client.post("/api/v1/classes/VIIA/join", json={"studentCode": "S99"}).status_code == 404
    assert client.post("/api/v1/classes/NOPE/join", json={"studentCode": "S01"}).status_code == 404


def test_events_are_idempotent(client):
    make_class(client)
    h = join(client)
    batch = {"events": [ev(1, result="invalid_sign"), ev(2, result="valid_progress")]}
    assert client.post("/api/v1/events:batch", headers=h, json=batch).json() == {"accepted": 2, "duplicates": 0}
    assert client.post("/api/v1/events:batch", headers=h, json=batch).json() == {"accepted": 0, "duplicates": 2}


def test_progress_keeps_best(client):
    make_class(client)
    h = join(client)
    client.put("/api/v1/progress", headers=h, json={"items": [{"levelId": "L1", "status": "mastered", "bestStreak": 4}]})
    client.put("/api/v1/progress", headers=h, json={"items": [{"levelId": "L1", "status": "active", "bestStreak": 1}]})
    items = client.get("/api/v1/progress", headers=h).json()["items"]
    assert items == [{"levelId": "L1", "status": "mastered", "bestStreak": 4}]


def test_summary_dominant_error_and_stuck(client):
    make_class(client)
    h = join(client)
    events = [ev(i, result="invalid_sign") for i in range(3)]
    events += [ev(10, result="invalid_arithmetic")]
    events += [ev(20 + i, "hint_opened", level=3, levelId="L2") for i in range(3)]
    events += [ev(30, "diagnostic_answer", skill="integerOps", correct=True)]
    events += [ev(31, "story_cards", ok=False)]
    client.post("/api/v1/events:batch", headers=h, json={"events": events})

    s = client.get("/api/v1/classes/VIIA/summary", headers=teacher(client)).json()
    row = next(r for r in s["students"] if r["studentCode"] == "S01")
    assert row["dominantError"] == "invalid_sign"
    assert row["errors"] == {"invalid_sign": 3, "invalid_arithmetic": 1, "modeling": 1}
    assert row["stuckLevels"] == ["L2"]
    assert row["diagnostic"] == {"integerOps": {"correct": 1, "total": 1}}
    s02 = next(r for r in s["students"] if r["studentCode"] == "S02")
    assert s02["joined"] is False


def test_teacher_cannot_read_other_class(client):
    make_class(client, code="VIIA", email="a@a.id")
    make_class(client, code="VIIB", email="b@b.id", students=("S01",))
    hb = teacher(client, email="b@b.id")
    assert client.get("/api/v1/classes/VIIA/summary", headers=hb).status_code == 404
    assert client.get("/api/v1/classes/VIIA/export", headers=hb).status_code == 404
    codes = [c["code"] for c in client.get("/api/v1/teacher/classes", headers=hb).json()["classes"]]
    assert codes == ["VIIB"]


def test_student_token_cannot_use_teacher_routes(client):
    make_class(client)
    h = join(client)
    assert client.get("/api/v1/classes/VIIA/summary", headers=h).status_code == 403


def test_wrong_pin(client):
    make_class(client)
    assert client.post("/api/v1/teacher/login", json={"email": "guru@a.id", "pin": "000000"}).status_code == 401


def test_export_csv(client):
    make_class(client)
    h = join(client)
    client.post("/api/v1/events:batch", headers=h, json={"events": [ev(1, result="valid_progress")]})
    r = client.get("/api/v1/classes/VIIA/export?format=csv", headers=teacher(client))
    assert r.status_code == 200
    assert r.text.splitlines()[0] == "student_code,session_id,ts,type,item_id,payload"
    assert "S01" in r.text


def test_dashboard_served(client):
    r = client.get("/dashboard/")
    assert r.status_code == 200 and "Dashboard Guru" in r.text


def test_download_page_and_apk(client):
    from app.download import latest_apk

    apk = latest_apk()
    if apk is None:
        pytest.skip("APK belum di-build")
    page = client.get("/download")
    assert page.status_code == 200 and "<svg" in page.text and apk.name in page.text
    r = client.get(f"/download/{apk.name}")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/vnd.android.package-archive"
    assert r.content[:2] == b"PK"  # APK is a zip
    assert client.get("/download/..%2Fserver%2F.env").status_code == 404
    assert client.get("/download/other.apk").status_code == 404


def test_security_headers(client):
    r = client.get("/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert "frame-ancestors 'none'" in r.headers["content-security-policy"]


def test_teacher_login_lockout(client):
    make_class(client)
    for _ in range(5):
        assert client.post("/api/v1/teacher/login", json={"email": "guru@a.id", "pin": "999999"}).status_code == 401
    # account locked even with the right PIN
    r = client.post("/api/v1/teacher/login", json={"email": "guru@a.id", "pin": "246810"})
    assert r.status_code == 429 and "Retry-After" in r.headers


def test_join_rate_limited(client):
    make_class(client)
    codes = [client.post("/api/v1/classes/VIIA/join", json={"studentCode": "S99"}).status_code for _ in range(11)]
    assert codes[:10] == [404] * 10 and codes[10] == 429


def test_body_and_payload_limits(client):
    make_class(client)
    h = join(client)
    big = ev(1, note="x" * 5000)
    assert client.post("/api/v1/events:batch", headers=h, json={"events": [big]}).status_code == 422
    r = client.post("/api/v1/events:batch", headers={**h, "Content-Type": "application/json"}, content=b"{" + b" " * 1_100_000 + b"}")
    assert r.status_code == 413


def test_short_teacher_pin_rejected(client):
    r = client.post("/api/v1/admin/classes", headers=ADMIN, json={
        "code": "X1", "name": "X", "teacher_email": "a@b.c", "teacher_pin": "1234", "student_codes": ["S01"]})
    assert r.status_code == 422


def test_production_refuses_default_secrets():
    from app.config import Settings, check_production
    with pytest.raises(RuntimeError):
        from app.config import DEV_JWT_SECRET, DEV_ADMIN_KEY
        check_production(Settings(env="production", jwt_secret=DEV_JWT_SECRET, admin_key=DEV_ADMIN_KEY, admin_api=True, _env_file=None))
    check_production(Settings(env="production", jwt_secret="x" * 40, admin_api=False, _env_file=None))


def test_admin_api_can_be_disabled(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "admin_api", False)
    assert client.post("/api/v1/admin/classes", headers=ADMIN, json={}).status_code == 404
