# SPLV app

Aplikasi Android untuk siswa SMP belajar **Sistem Persamaan Linear Satu Variabel (SPLSV)**. Rancangannya
berdasarkan **Cognitive Load Theory** dan bertujuan meningkatkan **literasi matematis**.
Aplikasi ini dikembangkan sebagai produk penelitian pengembangan model **ADDIE**.

> 🌐 **Versi web:** https://hanii0306.github.io/splsv-app/ (buka di browser, tanpa instal)
>
> Versi rilis **1.0.0** · paket Android `id.ac.splv.app` · semua koneksi HTTPS.

## Kenapa aplikasi ini ada

Wawancara tahap *Analysis* dengan siswa kelas VIII menemukan bahwa siswa:
- sering tertukar tanda saat "pindah ruas" (misalnya `−2x = 8`),
- kesulitan mengubah soal cerita menjadi persamaan,
- terganggu oleh teks panjang, hiasan, dan penjelasan yang terlalu cepat,
- terbantu oleh **visual timbangan**, **langkah demi langkah**, **hint bertahap**, dan **cek substitusi**.

Karena itu, aplikasi ini dibangun di sekitar timbangan 3D interaktif, satu langkah per layar, dan petunjuk
yang memudar. Detail lengkap ada di [prd.md](prd.md).

## Fitur utama (v1)

| Fitur | Ringkasan |
|---|---|
| Timbangan 3D | Persamaan divisualisasikan sebagai timbangan (Three.js) dan tetap seimbang jika operasinya sama di kedua sisi |
| Langkah terpandu | Satu transformasi per layar, siswa mengatur tempo sendiri |
| Penanda warna | Suku yang berubah disorot konsisten |
| Diagnostik prasyarat | Cek bilangan bulat, pecahan, dan aljabar dasar, lalu jalur adaptif |
| Pemodelan soal cerita | Baca per potongan → tandai kata kunci → misalkan x → susun persamaan |
| Hint bertingkat | Muncul setelah 2 kali salah dan memudar di soal berikutnya |
| Verifikasi | Substitusi balik + cek kewajaran jawaban |
| "Mengapa?" | Prompt penjelasan diri pada langkah kunci |

## Teknologi

Proyek ini memakai dua bahasa:

| Bagian | Bahasa & framework | Folder |
|---|---|---|
| Aplikasi siswa (APK Android) | **JavaScript**: React 18 + Vite, **Three.js** (timbangan 3D), Dexie (IndexedDB offline), **Capacitor** (APK) | [app/](app/) |
| Server & sinkronisasi | **Python**: **FastAPI** + SQLModel (SQLite/PostgreSQL), JWT | [server/](server/) |
| Dashboard guru | **JavaScript** murni (tanpa build), disajikan oleh FastAPI di `/dashboard/` | [server/app/static/dashboard/](server/app/static/dashboard/) |
| Alat penelitian | **Python**: analisis N-gain, Aiken's V, beban kognitif, log belajar, generator lembar soal | [research/](research/) |
| Pengujian | **Vitest** (mesin persamaan JS), **pytest** (API Python) | `app/tests/`, `server/tests/` |

Target HP: RAM 4–6 GB, Android 8+. Distribusi lewat **APK sideload**. Lihat [architecture.md](architecture.md).

## Struktur dokumen

| File | Isi |
|---|---|
| [prd.md](prd.md) | Kebutuhan produk, temuan wawancara → fitur, tujuan & indikator |
| [architecture.md](architecture.md) | Arsitektur teknis, modul, aliran data, performa 3D |
| [design.md](design.md) | Prinsip CLT, sistem visual, alur layar, spesifikasi timbangan 3D |
| [api.md](api.md) | Kontrak modul internal, skema konten, skema log, endpoint (opsional) |
| [task.md](task.md) | Rencana kerja per tahap ADDIE dan keputusan tertunda |
| [AGENTS.md](AGENTS.md) | Aturan untuk AI coding agent (vibe coding) yang mengerjakan repo ini |

## Menjalankan proyek

Prasyarat: Python 3.11+, Node.js 20+, dan (untuk APK) Android Studio dengan SDK 34 + JDK 17.

### 1. Server Python (FastAPI)

```powershell
cd server
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env            # lalu ganti secret & admin key
python -m pytest -q               # uji API
python -m scripts.create_class --code VIIA --name "VII-A" --teacher guru@sekolah.sch.id --pin 2468 --students 30
python -m scripts.make_certs     # sertifikat HTTPS untuk IP laptop (CA lokal ikut ke APK)
python -m scripts.serve          # https://<IP-laptop>:8443
```

- Dokumentasi API otomatis: https://localhost:8443/docs
- Dashboard guru: https://localhost:8443/dashboard/ (login memakai email + PIN guru dari perintah `create_class`)

### 2. Aplikasi siswa (JavaScript)

```powershell
cd app
npm install
copy .env.example .env            # isi VITE_API_URL
npm test                          # uji mesin persamaan
npm run dev                       # buka http://localhost:5173 (pakai mode HP di DevTools)
```

### 3. Build APK Android

APK **rilis bertanda tangan** ada di **`apk/SPLV-app-1.4.1.apk`** (±3,5 MB, Android 5.1+, langsung pakai tanpa server). Untuk build ulang setelah
mengubah kode/soal:

```powershell
powershell -ExecutionPolicy Bypass -File app\scripts\build-apk.ps1
```

Skrip ini menjalankan uji, build web, `cap sync`, lalu Gradle. Skrip memakai JDK 17 + Android SDK dari
`%LOCALAPPDATA%\android-build` (versi portable) atau dari `JAVA_HOME`/`ANDROID_HOME` bila Android Studio
terpasang. Langkah pemasangan di HP dan pelaksanaan sesi kelas ada di [panduan-uji-coba.md](panduan-uji-coba.md).

Untuk HP fisik, isi `VITE_API_URL` dengan IP laptop di WiFi yang sama (mis. `http://192.168.1.10:8000`).
Untuk emulator, pakai `http://10.0.2.2:8000`. Saat uji lapangan, gunakan server HTTPS.

## Etika & privasi data

- Identitas siswa hanya berupa **kode** (S01, S02, …). Nama, foto, dan rekaman tidak disimpan di aplikasi
  maupun di repositori.
- Data uji coba hanya dikumpulkan setelah ada izin sekolah, persetujuan orang tua/wali, dan persetujuan siswa.
- Transkrip wawancara **tidak** di-commit ke repositori.

## Status

Tahap **Development** ADDIE. Versi pertama kode sudah ada untuk aplikasi siswa (L0–L7), server, dan
dashboard guru. Rencana kerja ada di [task.md](task.md).
