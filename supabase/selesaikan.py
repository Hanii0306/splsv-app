"""Pasang database pemantauan SPLV app ke proyek Supabase Anda — sekali jalan.

    python supabase/selesaikan.py

Yang dilakukan:
 1. Minta token akses Supabase (sbp_…) — diketik tersembunyi, tidak disimpan.
 2. Menjalankan supabase/schema.sql (tabel `siswa`, RLS, fungsi lapor_siswa, view ringkasan_siswa).
 3. Mengambil kunci PUBLIK (publishable/anon) dan menulisnya ke app/.env (tidak ikut ke GitHub).
 4. Uji: melapor 1 siswa uji lewat kunci publik, memastikan publik TIDAK bisa membaca tabel,
    lalu menghapus siswa uji.
Tidak membuat apa pun yang berbayar.
"""

from __future__ import annotations

import getpass
import json
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

PROJECT_REF = "srecbgukyzvdcfberdlb"
PROJECT_URL = f"https://{PROJECT_REF}.supabase.co"
API = "https://api.supabase.com/v1"
ROOT = Path(__file__).resolve().parents[1]


def call(method: str, url: str, headers: dict, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"Content-Type": "application/json", "User-Agent": "splv-setup", **headers})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read().decode() or "null"
            return r.status, json.loads(raw) if raw.strip().startswith(("{", "[", "null")) else raw
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def sql(token: str, query: str):
    status, out = call("POST", f"{API}/projects/{PROJECT_REF}/database/query", {"Authorization": f"Bearer {token}"}, {"query": query, "read_only": False})
    if status >= 300:
        raise SystemExit(f"Gagal menjalankan SQL (HTTP {status}): {out}")
    return out


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    token = (sys.argv[1] if len(sys.argv) > 1 else getpass.getpass("Tempel token Supabase (sbp_…), lalu Enter: ")).strip()
    if not token.startswith("sbp_"):
        raise SystemExit("Token harus diawali 'sbp_'. Buat di https://supabase.com/dashboard/account/tokens")

    auth = {"Authorization": f"Bearer {token}"}
    status, proj = call("GET", f"{API}/projects/{PROJECT_REF}", auth)
    if status != 200:
        raise SystemExit(f"Token tidak bisa mengakses proyek {PROJECT_REF} (HTTP {status}). Pastikan proyek dipilih saat membuat token.")
    print(f"✓ Proyek ditemukan: {proj.get('name')} ({proj.get('region')}), status {proj.get('status')}")

    sql(token, (ROOT / "supabase" / "schema.sql").read_text(encoding="utf-8"))
    print("✓ Tabel siswa, fungsi lapor_siswa(), dan view ringkasan_siswa dibuat")

    status, keys = call("GET", f"{API}/projects/{PROJECT_REF}/api-keys?reveal=true", auth)
    if status != 200 or not isinstance(keys, list):
        raise SystemExit(f"Gagal mengambil kunci API (HTTP {status}): {keys}")
    pub = next((k["api_key"] for k in keys if k.get("type") == "publishable" and k.get("api_key")), None) \
        or next((k["api_key"] for k in keys if k.get("name") == "anon" and k.get("api_key")), None)
    if not pub:
        raise SystemExit("Kunci publik (publishable/anon) tidak ditemukan.")
    print(f"✓ Kunci publik diambil ({pub[:16]}…)")

    env = ROOT / "app" / ".env"
    lines = [l for l in (env.read_text(encoding="utf-8").splitlines() if env.exists() else []) if not l.startswith("VITE_SUPABASE_")]
    lines += [f"VITE_SUPABASE_URL={PROJECT_URL}", f"VITE_SUPABASE_KEY={pub}"]
    env.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("✓ app/.env diisi (tidak ikut ke GitHub)")

    # --- end-to-end test with the PUBLIC key, exactly like the app does
    h = {"apikey": pub}
    if pub.startswith("eyJ"):
        h["Authorization"] = f"Bearer {pub}"
    test_install = str(uuid.uuid4())
    status, out = call("POST", f"{PROJECT_URL}/rest/v1/rpc/lapor_siswa", h, {"p": {
        "kode_siswa": "UJI99", "install_id": test_install, "platform": "web", "versi_aplikasi": "setup",
        "level_dikuasai": ["L0"], "soal_selesai": 3, "nilai_kuis_terakhir": 80, "nilai_kuis_terbaik": 80,
        "salah_tanda": 1, "salah_satu_ruas": 0, "salah_hitung": 0, "salah_pemodelan": 0, "kesalahan_dominan": "Tanda / pindah ruas"}})
    if status >= 300:
        raise SystemExit(f"Uji lapor_siswa gagal (HTTP {status}): {out}")
    rows = sql(token, f"select kode_siswa, platform, soal_selesai from siswa where install_id = '{test_install}'")
    assert rows and rows[0]["kode_siswa"] == "UJI99", rows
    print("✓ Uji kirim laporan lewat kunci publik: BERHASIL (baris muncul di tabel)")

    status, out = call("GET", f"{PROJECT_URL}/rest/v1/siswa?select=kode_siswa", h)
    leaked = status == 200 and isinstance(out, list) and len(out) > 0
    print("✓ Publik TIDAK bisa membaca daftar siswa" if not leaked else "✗ PERINGATAN: tabel bisa dibaca publik!")
    status, out = call("GET", f"{PROJECT_URL}/rest/v1/ringkasan_siswa?select=kode_siswa", h)
    leaked2 = status == 200 and isinstance(out, list) and len(out) > 0
    print("✓ Publik TIDAK bisa membaca ringkasan_siswa" if not leaked2 else "✗ PERINGATAN: view bisa dibaca publik!")

    sql(token, f"delete from siswa where install_id = '{test_install}'")
    print("✓ Siswa uji dihapus")
    print("\nSELESAI. Beri tahu Claude: \"supabase sudah selesai\" — lalu hapus token di halaman Access Tokens (Revoke).")
    if leaked or leaked2:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
