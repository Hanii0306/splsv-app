"""Buat server/.env untuk mode PRODUKSI (server terbuka ke internet) dengan secret acak.

    python -m scripts.init_env            # tidak menimpa .env yang sudah ada
    python -m scripts.init_env --force    # buat ulang (semua siswa & guru harus login ulang)
"""

import argparse
import secrets
from pathlib import Path

ENV = Path(__file__).resolve().parents[1] / ".env"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--force", action="store_true")
    a = p.parse_args()
    if ENV.exists() and not a.force:
        print(f"{ENV} sudah ada. Tidak diubah (pakai --force untuk membuat ulang).")
        return
    ENV.write_text(
        "\n".join([
            "# Dibuat oleh scripts/init_env.py. RAHASIA: jangan dibagikan / di-commit.",
            "SPLV_ENV=production",
            f"SPLV_JWT_SECRET={secrets.token_urlsafe(48)}",
            f"SPLV_ADMIN_KEY={secrets.token_urlsafe(32)}",
            "# Endpoint admin lewat HTTP dimatikan: kelola kelas dengan scripts/create_class.py di laptop.",
            "SPLV_ADMIN_API=false",
            "# Di belakang Cloudflare Tunnel: pakai IP asli klien untuk pembatasan percobaan.",
            "SPLV_TRUST_PROXY=true",
            "# Aplikasi Android memakai HTTP native (tanpa CORS); dashboard satu origin.",
            "SPLV_CORS_ORIGINS=",
            "SPLV_DATABASE_URL=sqlite:///./splv.db",
            "",
        ]),
        encoding="utf-8",
    )
    print(f"{ENV} dibuat (mode produksi, secret acak).")


if __name__ == "__main__":
    main()
