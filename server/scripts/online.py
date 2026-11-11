"""Online-kan server SPLV app ke internet dengan HTTPS resmi (Cloudflare Tunnel, tanpa akun).

    python -m scripts.online

- Server FastAPI hanya mendengarkan di 127.0.0.1 (tidak terbuka ke WiFi), lalu cloudflared
  membuat alamat publik https://<acak>.trycloudflare.com dengan sertifikat yang dipercaya semua HP.
- Alamat publik dicetak di layar dan disimpan di server/PUBLIC_URL.txt.
- Alamat "quick tunnel" BERUBAH setiap kali perintah ini dijalankan ulang. Untuk alamat tetap,
  pakai Named Tunnel (akun Cloudflare + domain) atau hosting (lihat panduan-uji-coba.md).
- Tekan Ctrl+C untuk mematikan.
"""

import os
import re
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path

SERVER = Path(__file__).resolve().parents[1]
BIN = Path(os.environ.get("LOCALAPPDATA", SERVER)) / "splv-tools" / "cloudflared.exe"
URL_FILE = SERVER / "PUBLIC_URL.txt"
CF_URL = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
PORT = 8000


def ensure_cloudflared() -> Path:
    if BIN.exists():
        return BIN
    BIN.parent.mkdir(parents=True, exist_ok=True)
    print("Mengunduh cloudflared (sekali saja)...")
    urllib.request.urlretrieve(CF_URL, BIN)
    return BIN


def main() -> None:
    env_file = SERVER / ".env"
    if not env_file.exists() or "SPLV_ENV=production" not in env_file.read_text(encoding="utf-8"):
        raise SystemExit("Belum mode produksi. Jalankan dulu:  python -m scripts.init_env")

    cf = ensure_cloudflared()
    api = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(PORT),
         "--proxy-headers", "--forwarded-allow-ips", "127.0.0.1", "--no-server-header"],
        cwd=SERVER,
    )
    tunnel = subprocess.Popen(
        [str(cf), "tunnel", "--no-autoupdate", "--url", f"http://127.0.0.1:{PORT}"],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace",
    )
    found = threading.Event()

    def watch() -> None:
        for line in tunnel.stdout:
            m = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
            if m and not found.is_set():
                url = m.group(0)
                URL_FILE.write_text(url + "\n", encoding="utf-8")
                found.set()
                print("\n" + "=" * 64)
                print(f"  ONLINE  {url}")
                print(f"  Unduh APK  : {url}/download")
                print(f"  Dashboard  : {url}/dashboard/")
                print(f"  Isi di aplikasi (Alamat server): {url}")
                print("=" * 64 + "\n", flush=True)
            elif re.search(r"ERR|error", line) and "Retrying" not in line:
                print("[cloudflared]", line.strip(), flush=True)

    threading.Thread(target=watch, daemon=True).start()
    try:
        if not found.wait(60):
            print("Tunnel belum siap dalam 60 detik. Cek koneksi internet.", flush=True)
        while api.poll() is None and tunnel.poll() is None:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        for p in (tunnel, api):
            p.terminate()
        print("Server dimatikan.")


if __name__ == "__main__":
    main()
