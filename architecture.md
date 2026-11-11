# Architecture

Status: v0.1. Bahasa yang dipakai (keputusan pengembang): **Python + framework** untuk server dan
**JavaScript + framework** untuk aplikasi siswa & dashboard.

## 1. Ringkasan keputusan

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Platform | Android (APK) via **Capacitor** ✅ dikonfirmasi | Three.js berjalan alami di WebView. Satu basis kode juga bisa jadi PWA/iOS kelak. Cocok untuk vibe coding |
| UI | **JavaScript**: React 18 + Vite (JSX, tipe via JSDoc) ✅ | Ekosistem luas, mudah dibantu AI agent |
| 3D | Three.js 0.169 (impor modular), tanpa framework tambahan | Kontrol penuh atas performa |
| State | React state + Dexie (tanpa library state tambahan) | Lebih sedikit dependensi |
| Penyimpanan | Dexie (IndexedDB), offline-first + antrean sinkron ✅ | Siswa bisa offline maupun online |
| Konten | File JSON yang dibundel | Bisa direvisi ahli materi tanpa mengubah kode |
| Backend | **Python FastAPI** ✅ + SQLModel (SQLite untuk dev, PostgreSQL untuk produksi), JWT, PIN guru di-hash PBKDF2. Akses data per kelas dicek di setiap endpoint (`server/app/routes.py`) | Pengembang memilih Python. Ini menggantikan Supabase |
| Distribusi | Signed APK **sideload** ✅. Pembaruan konten dicek via `/content/version`, pembaruan APK lewat notifikasi dalam aplikasi | Tanpa Play Store |
| Dashboard guru | JavaScript murni (tanpa build), disajikan FastAPI di `/dashboard/` (`server/app/static/dashboard/`) | Guru membuka di laptop/HP tanpa install |
| Pengujian | Vitest (`app/tests/`), pytest (`server/tests/`), uji manual di HP | |

## 2. Diagram lapisan

```
┌──────────────────────────────────────────────────────────┐
│  Android (Capacitor WebView)                             │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ app/  Router · Providers · Layout                    │ │
│ ├──────────────────────────────────────────────────────┤ │
│ │ features/                                            │ │
│ │  diagnostic  lesson  practice  story  review  research│ │
│ ├───────────────┬───────────────────┬──────────────────┤ │
│ │ ui/           │ scene3d/          │ telemetry/       │ │
│ │ EquationLine  │ ScaleScene        │ logEvent         │ │
│ │ HintPanel     │ ScaleController ◄─┼─ (API §3)        │ │
│ │ StepNav       │ Fallback2D (SVG)  │ exporter         │ │
│ ├───────────────┴───────────────────┴──────────────────┤ │
│ │ engine/ (murni, tanpa UI)                            │ │
│ │  fraction · equation · transforms · validator        │ │
│ │  hintEngine · adaptive · storyModel                  │ │
│ ├──────────────────────────────────────────────────────┤ │
│ │ storage/ (Dexie)   content/ (JSON dibundel)          │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

Aturan dependensi: `features → ui, scene3d, engine, storage, telemetry`, sedangkan `engine` tidak
bergantung pada modul apa pun. `scene3d` hanya bergantung pada `engine` (tipe) dan `three`.

## 3. Modul inti

### 3.1 `engine/fraction.js`
Pecahan eksak `{n: bigint|number, d}` dengan operasi `add, sub, mul, div, eq, toString`. Semua koefisien
persamaan memakai tipe ini agar `½(x+3)=5` tidak menghasilkan kesalahan pembulatan.

### 3.2 `engine/equation.js`
Representasi dua tingkat:
- **Bentuk tampilan (AST)**: menjaga struktur yang ditulis siswa, misalnya `3(x − 2)`, agar langkah
  distribusi bisa diajarkan.
- **Bentuk normal linear**: setiap ruas = `a·x + b` (a, b pecahan). Dipakai untuk validasi kesetaraan.

`parse(str)` menerima input terbatas: bilangan bulat/pecahan, `x`, `+ − × ÷`, kurung, dan `=`.

### 3.3 `engine/transforms.js`
Transformasi sah yang diajarkan, masing-masing menghasilkan `Step` (lihat `api.md`):
`addBoth(k)`, `subBoth(k)`, `mulBoth(k)`, `divBoth(k)`, `distribute()`, `combineLike(side)`,
`clearDenominators(lcd)`, serta `moveTerm(term)` yang **diterjemahkan** menjadi `addBoth/subBoth/divBoth`
dan ditampilkan dengan keterangan "sama dengan mengurangi kedua ruas dengan …" (IL01).

### 3.4 `engine/validator.js`
Mengklasifikasi langkah siswa:
- `valid_progress`: setara dan lebih dekat ke `x = c`
- `valid_no_progress`: setara tetapi tidak maju (misalnya menambah 3 lalu mengurangi 3)
- `invalid_one_side`: operasi hanya pada satu ruas (timbangan miring)
- `invalid_sign`: tanda salah, misalnya `−2x = 8 → x = 8 + 2` (pola IL01)
- `invalid_arithmetic`: operasi benar tetapi hitungannya salah (IL03)

Klasifikasi kesalahan ini memberi makan `hintEngine` dan log penelitian.

### 3.5 `engine/hints.js`
Mesin keadaan per langkah: `idle → offered (setelah 2 salah beruntun) → H1 → H2 → H3 → H4`.
Tingkat awal pada soal berikutnya yang setipe diturunkan sesuai riwayat (fading). Isi hint diambil dari
konten JSON, dipilih berdasarkan jenis kesalahan.

### 3.6 `engine/adaptive.js`
- Diagnostik → profil prasyarat `{integerOps, fractions, algebraSimplify}` ∈ {lemah, cukup, kuat}.
- Aturan sederhana berbasis ambang (bukan ML): lemah → sisipkan modul penguatan. Penguasaan level =
  3 soal benar berturut-turut dengan ≤ 1 hint. Siswa yang mahir boleh melewati contoh (expertise reversal).

### 3.7 `engine/story.js`
Model soal cerita: potongan kalimat, token kata kunci beserta perannya, pemisalan yang diharapkan,
dan kumpulan kartu persamaan. Memvalidasi tag yang ditandai siswa dan susunan kartu.

### 3.8 `scene3d/`
- `ScaleScene`: satu `WebGLRenderer`, kamera ortografis/perspektif sempit, 1 lampu arah + ambient,
  material `MeshLambertMaterial` (murah).
- Objek: lengan & dua piring timbangan, **kotak-x** (InstancedMesh), **beban satuan** (InstancedMesh),
  dan **balon** untuk nilai negatif.
- Sudut kemiringan = `clamp(k · (kiri − kanan), ±12°)` yang dihitung dari bentuk normal dengan
  nilai uji `x`. Jika persamaan setara, kemiringannya 0.
- Render-on-demand: frame hanya digambar saat tween berjalan atau saat ada interaksi.
- `ScaleController` (API §3) adalah satu-satunya pintu dari React.
- `Fallback2D`: SVG dengan API yang sama, dipakai bila WebGL gagal, FPS < 20 selama 2 detik, atau
  pengguna memilih "mode ringan".

### 3.9 `storage/`
Tabel Dexie: `profile`, `progress`, `attempts`, `events`, `settings`. Skema di `api.md` §4.

### 3.10 `telemetry/`
`logEvent()` menulis ke tabel `events`. Exporter menghasilkan CSV/JSON lalu dibagikan lewat Android
Share Sheet (Capacitor Share/Filesystem).

### 3.11 `sync/`
- Setiap event & perubahan progres masuk tabel `outbox` (Dexie) dengan status `pending`.
- `SyncWorker` berjalan saat aplikasi dibuka, saat status jaringan berubah ke online (Capacitor Network),
  dan setiap 2 menit selama online. Ia mengirim batch ≤ 200 event ke `POST /events:batch`.
- Idempoten: kunci `clientEventId` (uuid) sehingga pengiriman ulang tidak menggandakan data.
- Konflik progres: server menyimpan nilai "terbaik" (status tertinggi, streak terbaik). Perangkat adalah
  sumber kebenaran untuk event.
- Gagal kirim → backoff eksponensial (30 dtk → 30 mnt). Aplikasi tidak pernah memblokir belajar karena sinkron.

### 3.12 `dashboard/` (web guru)
Halaman: Masuk (email guru) → Kelas saya → Detail kelas (tabel siswa × level, grafik jenis kesalahan) →
Detail siswa (riwayat level, hint, jawaban "Mengapa?"). Hanya baca, tidak mengubah data siswa.

## 4. Aliran data: satu langkah latihan

```
Siswa pilih aksi "kurangi 5 dari kedua ruas"
  → features/practice memanggil engine.transforms.subBoth(5)
  → engine.validator.classify(prev, next) = valid_progress
  → scene3d.ScaleController.apply(step) → animasi beban diambil di kedua piring
  → ui.EquationLine menyorot "−5" di kedua ruas (warna operasi)
  → telemetry.logEvent({type:'step', result:'valid_progress', ms: 8400})
  → storage.attempts diperbarui
Jika salah 2× beruntun → hintEngine.state = offered → tombol Bantuan menyala
```

## 5. Anggaran performa (target HP RAM 4–6 GB, minimum RAM 3 GB)

| Metrik | Target |
|---|---|
| Ukuran bundle JS awal (tanpa three) | ≤ 250 KB gzip |
| Chunk Three.js (lazy) | ≤ 200 KB gzip (impor modular) |
| Jumlah draw call scene | ≤ 25 |
| Segitiga | ≤ 50 rb |
| FPS saat animasi | ≥ 50 (target) / ≥ 30 (minimum) |
| Bayangan | 1 shadow map 1024 px hanya pada perangkat target; dimatikan di mode ringan |
| Memori JS | ≤ 150 MB |

## 6. Struktur folder

```
Literacy_app/
├─ android/                 # dihasilkan Capacitor
├─ content/
│  ├─ levels/L0..L7.json
│  ├─ diagnostic.json
│  └─ stories/*.json
├─ src/
│  ├─ app/
│  ├─ features/{diagnostic,lesson,practice,story,review,research}/
│  ├─ engine/
│  ├─ scene3d/
│  ├─ ui/
│  ├─ storage/
│  ├─ telemetry/
│  └─ styles/tokens.css
├─ tests/{engine,e2e}/
├─ capacitor.config.json
└─ *.md (dokumen ini)
```

## 7. Build & rilis
1. `npm run build`, lalu `npx cap sync android`.
2. Android Studio: buat *signed APK*, `minSdk 26`, `targetSdk 34`.
3. Distribusi uji coba: APK dibagikan langsung (sideload) atau lewat Google Play Internal Testing **[ASUMSI]**.

## 8. Keamanan & privasi
- Tidak ada izin Android selain yang dibutuhkan (tanpa lokasi, tanpa kontak). Izin mikrofon hanya bila
  fitur rekam penjelasan (F8 opsional) diaktifkan.
- Data lokal tidak dienkripsi di v1 karena tidak berisi identitas. Kode siswa saja.
- Ekspor data hanya lewat menu peneliti yang dilindungi PIN.

## 9. HTTPS & rilis (v1.0.0)
- **Android**: `usesCleartextTraffic=false` + `res/xml/network_security_config.xml` mempercayai CA sistem
  **dan** CA lokal SPLV app (`res/raw/splv_ca.pem`). Request memakai **CapacitorHttp** (stack HTTP native),
  sehingga aturan kepercayaan ini berlaku dan CORS tidak diperlukan di HP.
- **Server**: `scripts/make_certs.py` membuat CA lokal (sekali) + sertifikat server ber-SAN IP laptop
  (bisa diperbarui tanpa build ulang APK). `scripts/serve.py` menjalankan uvicorn dengan TLS di port 8443.
  Untuk hosting publik, pakai sertifikat publik (Let's Encrypt) di reverse proxy.
- **Aplikasi**: `validateServerUrl()` hanya menerima `https://`, kecuali `http://localhost` di browser desktop saat pengembangan.
- **Penandatanganan**: `app/android/keystore/splv-release.jks` (PKCS12, RSA 3072) via `keystore.properties`.
  Keduanya tidak di-commit. `app/scripts/build-apk.ps1` → `assembleRelease` + `apksigner verify`.
