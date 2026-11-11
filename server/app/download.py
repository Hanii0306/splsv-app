"""APK download page with QR code: students scan it on the school WiFi (no internet needed)."""

import hashlib
import html
import io
from functools import lru_cache
from pathlib import Path

import qrcode
import qrcode.image.svg
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse

APK_DIR = Path(__file__).resolve().parents[2] / "apk"
APK_MIME = "application/vnd.android.package-archive"

router = APIRouter()


def latest_apk() -> Path | None:
    apks = sorted(APK_DIR.glob("SPLV-app-*.apk"), key=lambda p: p.stat().st_mtime, reverse=True)
    return apks[0] if apks else None


@lru_cache(maxsize=8)
def _sha256(path: str, mtime: float) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def qr_svg(text: str) -> str:
    img = qrcode.make(text, image_factory=qrcode.image.svg.SvgPathImage, box_size=12, border=2)
    buf = io.BytesIO()
    img.save(buf)
    return buf.getvalue().decode().split("?>", 1)[-1]  # drop XML declaration for inline use


@router.get("/download", response_class=HTMLResponse, include_in_schema=False)
@router.get("/download/", response_class=HTMLResponse, include_in_schema=False)
def download_page(request: Request):
    apk = latest_apk()
    if apk is None:
        raise HTTPException(404, "APK belum dibuat. Jalankan app\\scripts\\build-apk.ps1")
    base = str(request.base_url).rstrip("/")
    page_url = f"{base}/download"
    file_url = f"{base}/download/{apk.name}"
    st = apk.stat()
    sha = _sha256(str(apk), st.st_mtime)
    size = f"{st.st_size / 1_048_576:.1f} MB"
    e = html.escape
    return f"""<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Unduh SPLV app</title>
<style>
 :root{{--bg:#FAFAF7;--s:#fff;--t:#1F2328;--m:#5B6470;--b:#E3E5E8;--v:#2563EB}}
 @media (prefers-color-scheme:dark){{:root{{--bg:#16181D;--s:#20232A;--t:#E8EAED;--m:#A0A8B3;--b:#343842;--v:#7AA2F7}}}}
 body{{margin:0;background:var(--bg);color:var(--t);font:17px/1.5 system-ui,sans-serif}}
 main{{max-width:520px;margin:0 auto;padding:24px 16px}}
 h1{{margin:.2em 0}} .muted{{color:var(--m);font-size:14px}}
 .btn{{display:block;text-align:center;background:var(--v);color:#fff;text-decoration:none;font-weight:700;padding:16px;border-radius:14px;margin:16px 0}}
 .qr{{background:#fff;border-radius:16px;padding:12px;max-width:300px;margin:12px auto}} .qr svg{{width:100%;height:auto;display:block}}
 .card{{background:var(--s);border:1px solid var(--b);border-radius:14px;padding:14px 16px;margin:12px 0}}
 code{{word-break:break-all;font-size:12px}} ol{{padding-left:20px}}
</style></head>
<body><main>
 <div style="font-size:48px">⚖</div>
 <h1>SPLV app</h1>
 <p class="muted">Belajar persamaan linear satu variabel · {e(apk.name)} · {size} · Android 8+</p>
 <a class="btn" href="{e(file_url)}" download>⬇ Unduh APK</a>
 <div class="card">
  <strong>Pindai dari HP lain</strong> (WiFi yang sama):
  <div class="qr">{qr_svg(page_url)}</div>
  <p class="muted" style="text-align:center">{e(page_url)}</p>
 </div>
 <div class="card">
  <strong>Cara pasang</strong>
  <ol>
   <li>Jika browser memperingatkan "koneksi tidak privat", pilih <em>Lanjutan → Lanjutkan</em> (server lokal sekolah).</li>
   <li>Ketuk <em>Unduh APK</em>, lalu buka file yang terunduh.</li>
   <li>Izinkan <em>Instal aplikasi tidak dikenal</em> untuk browser bila diminta.</li>
   <li>Jika Play Protect bertanya, pilih <em>Tetap instal</em>.</li>
  </ol>
 </div>
 <p class="muted">SHA-256: <code>{sha}</code></p>
</main></body></html>"""


@router.get("/download/{name}", include_in_schema=False)
def download_file(name: str):
    apk = latest_apk()
    # Only ever serve the current APK by its exact name (no path traversal).
    if apk is None or name != apk.name:
        raise HTTPException(404, "File tidak ditemukan")
    return FileResponse(apk, media_type=APK_MIME, filename=apk.name)
