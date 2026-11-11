from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator

CODE_PATTERN = r"^[A-Za-z0-9_-]{2,32}$"


class CreateClassIn(BaseModel):
    code: str = Field(pattern=CODE_PATTERN)
    name: str = Field(min_length=1, max_length=80)
    teacher_email: str = Field(min_length=3, max_length=120)
    teacher_pin: str = Field(min_length=6, max_length=64)
    student_codes: list[str] = Field(min_length=1, max_length=200)

    @field_validator("student_codes")
    @classmethod
    def _codes(cls, v: list[str]) -> list[str]:
        import re

        cleaned = [c.strip().upper() for c in v]
        bad = [c for c in cleaned if not re.match(CODE_PATTERN, c)]
        if bad:
            raise ValueError(f"Kode siswa tidak valid: {bad}")
        if len(set(cleaned)) != len(cleaned):
            raise ValueError("Kode siswa duplikat")
        return cleaned


class CreateClassOut(BaseModel):
    code: str
    name: str
    teacher_email: str
    student_codes: list[str]


class JoinIn(BaseModel):
    student_code: str = Field(alias="studentCode", pattern=CODE_PATTERN)

    model_config = {"populate_by_name": True}


class TokenOut(BaseModel):
    token: str
    class_code: str = Field(serialization_alias="classCode")
    student_code: Optional[str] = Field(default=None, serialization_alias="studentCode")


EventType = Literal[
    "session_start", "session_end", "diagnostic_answer", "item_start", "step",
    "item_complete", "hint_offered", "hint_opened", "why_answer", "verify_substitution",
    "story_tag", "story_let", "story_cards", "scale_fallback", "cl_questionnaire", "break_taken",
    "reinforcement_answer", "quiz_answer", "summary_view",
]


class EventIn(BaseModel):
    client_event_id: str = Field(alias="clientEventId", min_length=8, max_length=64)
    session_id: str = Field(alias="sessionId", min_length=1, max_length=64)
    ts: int
    type: EventType
    item_id: Optional[str] = Field(default=None, alias="itemId", max_length=64)
    payload: dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}

    @field_validator("payload")
    @classmethod
    def _payload_size(cls, v: dict[str, Any]) -> dict[str, Any]:
        import json

        from .config import settings

        if len(json.dumps(v, ensure_ascii=False)) > settings.max_event_payload_bytes:
            raise ValueError("payload terlalu besar")
        return v


class EventBatchIn(BaseModel):
    events: list[EventIn] = Field(max_length=500)


class EventBatchOut(BaseModel):
    accepted: int
    duplicates: int


class ProgressItem(BaseModel):
    level_id: str = Field(alias="levelId", max_length=16)
    status: Literal["locked", "active", "mastered"]
    best_streak: int = Field(alias="bestStreak", ge=0)

    model_config = {"populate_by_name": True}


class ProgressBatchIn(BaseModel):
    items: list[ProgressItem] = Field(max_length=50)


class TeacherLoginIn(BaseModel):
    email: str = Field(max_length=120)
    pin: str = Field(max_length=64)
