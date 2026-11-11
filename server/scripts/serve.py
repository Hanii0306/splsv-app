"""Jalankan server SPLV app dengan HTTPS (default port 8443).

    python -m scripts.serve                 # pakai certs/server.key + certs/server.crt
    python -m scripts.serve --port 443

Buat sertifikat dulu dengan:  python -m scripts.make_certs
"""

import argparse
from pathlib import Path

import uvicorn

CERTS = Path(__file__).resolve().parents[1] / "certs"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--host", default="0.0.0.0")
    p.add_argument("--port", type=int, default=8443)
    a = p.parse_args()
    key, crt = CERTS / "server.key", CERTS / "server.crt"
    if not key.exists() or not crt.exists():
        raise SystemExit("Sertifikat belum ada. Jalankan dulu: python -m scripts.make_certs")
    uvicorn.run("app.main:app", host=a.host, port=a.port, ssl_keyfile=str(key), ssl_certfile=str(crt), proxy_headers=True)


if __name__ == "__main__":
    main()
