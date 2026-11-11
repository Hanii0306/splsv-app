"""Database tables.

Privacy rule (AGENTS.md §5): no student names are ever stored. Students are identified
only by researcher-issued codes (S01, S02, ...) scoped to a class code.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel, UniqueConstraint


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Teacher(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    pin_hash: str
    created_at: datetime = Field(default_factory=utcnow)


class ClassRoom(SQLModel, table=True):
    code: str = Field(primary_key=True)
    name: str
    teacher_id: int = Field(foreign_key="teacher.id", index=True)
    created_at: datetime = Field(default_factory=utcnow)


class Student(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("class_code", "code"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    class_code: str = Field(foreign_key="classroom.code", index=True)
    code: str
    joined_at: Optional[datetime] = None
    last_sync_at: Optional[datetime] = None


class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    client_event_id: str = Field(index=True, unique=True)
    class_code: str = Field(index=True)
    student_code: str = Field(index=True)
    session_id: str
    ts: int  # epoch ms, from device
    type: str = Field(index=True)
    item_id: Optional[str] = None
    payload: str = "{}"  # JSON text
    received_at: datetime = Field(default_factory=utcnow)


class Progress(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("class_code", "student_code", "level_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    class_code: str = Field(index=True)
    student_code: str = Field(index=True)
    level_id: str
    status: str = "locked"  # locked | active | mastered
    best_streak: int = 0
    updated_at: datetime = Field(default_factory=utcnow)
