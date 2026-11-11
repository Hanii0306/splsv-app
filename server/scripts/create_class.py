"""Peneliti: buat kelas + kode siswa langsung ke database (bukan lewat internet).

Contoh:
    python -m scripts.create_class --code VIIA --name "VII-A" \
        --teacher guru@sekolah.sch.id --pin 246810 --students 30

Kode kelas otomatis diberi akhiran acak (mis. VIIA-7KQ2) agar tidak bisa ditebak orang lain
di internet. Kode siswa dibuat berurutan: S01, S02, ... (tanpa nama siswa).
"""

import argparse
import secrets

from sqlmodel import Session, select

from app.db import engine, init_db
from app.models import ClassRoom, Student, Teacher
from app.security import hash_pin

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I, easy to read aloud


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--code", required=True, help="awalan kode kelas, mis. VIIA")
    p.add_argument("--name", required=True)
    p.add_argument("--teacher", required=True, help="email guru")
    p.add_argument("--pin", required=True, help="PIN login guru (min 6 karakter)")
    p.add_argument("--students", type=int, default=30, help="jumlah kode siswa")
    p.add_argument("--prefix", default="S")
    p.add_argument("--no-suffix", action="store_true", help="tanpa akhiran acak (hanya untuk uji lokal)")
    a = p.parse_args()

    if len(a.pin) < 6:
        raise SystemExit("PIN guru minimal 6 karakter.")
    init_db()
    code = a.code.upper() if a.no_suffix else f"{a.code.upper()}-{''.join(secrets.choice(ALPHABET) for _ in range(4))}"
    with Session(engine) as db:
        if db.get(ClassRoom, code):
            raise SystemExit(f"Kelas {code} sudah ada.")
        email = a.teacher.strip().lower()
        teacher = db.exec(select(Teacher).where(Teacher.email == email)).first()
        if teacher is None:
            teacher = Teacher(email=email, pin_hash=hash_pin(a.pin))
            db.add(teacher)
            db.flush()
        db.add(ClassRoom(code=code, name=a.name, teacher_id=teacher.id))
        width = max(2, len(str(a.students)))
        codes = [f"{a.prefix}{i:0{width}d}" for i in range(1, a.students + 1)]
        for c in codes:
            db.add(Student(class_code=code, code=c))
        db.commit()
    print(f"Kelas dibuat untuk {email}.")
    print(f"  KODE KELAS : {code}   <- bagikan ke siswa (rahasiakan dari luar kelas)")
    print(f"  Kode siswa : {', '.join(codes)}")


if __name__ == "__main__":
    main()
