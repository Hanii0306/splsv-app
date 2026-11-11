# Panduan Uji Coba SPLV app 1.4.1

Untuk peneliti. Ikuti urutan ini sebelum sesi di kelas. Semua koneksi memakai **HTTPS**.

## 🌐 VERSI WEB: buka lewat link (tanpa instal)

**Link:** https://hanii0306.github.io/splsv-app/

1. Buka link di HP/laptop. Link ini publik: siapa saja yang tahu alamatnya bisa membuka.
2. Masuk dengan kode siswa + PIN (lihat bagian Akun siswa).
3. Progres tersimpan di browser masing-masing siswa (pakai browser & HP yang sama setiap kali; mode
   penyamaran/incognito tidak menyimpan progres).
4. Ekspor data: ⚙ → PIN → **CSV**, lalu salin teks yang muncul (tombol **Salin teks**).
5. Memperbarui situs setelah mengubah soal/kode: `node app/scripts/deploy-web.mjs "pesan perubahan"`.

## 👩‍🏫 Akun siswa (kode + PIN)

Setiap siswa punya **kode** (mis. S07) dan **PIN 4–6 angka**. Satu HP/browser boleh dipakai bergantian.

- **Siswa membuat sendiri:** layar awal → **Daftar baru** → kode dari guru + buat PIN.
- **Guru membuat sekaligus (disarankan):** ⚙ → PIN peneliti → **Akun siswa** → awalan `S`, jumlah `32` → **Buat akun** →
  **Salin daftar kode & PIN**, lalu bagikan ke siswa. Simpan daftar nama ↔ kode di catatan guru, bukan di aplikasi.
- **Masuk:** pilih/ketik kode → PIN → **Masuk**. Selesai belajar: **"Bukan S07? Keluar"** di Peta Belajar.
- **Lupa PIN:** ⚙ → Akun siswa → **Reset PIN** (PIN baru langsung tampil).
- 5× PIN salah → tunggu 1 menit.
- Akun tersimpan **per perangkat/browser**. Di HP/browser lain, buat akunnya lagi (atau pakai akun massal).

## ⭐ PALING MUDAH: langsung pakai (tanpa server, tanpa internet)

1. Kirim **`apk/SPLV-app-1.4.1.apk`** ke HP (WhatsApp/Drive/kabel), buka filenya, lalu **Instal**.
   Bila diminta, izinkan "Instal aplikasi tidak dikenal". Bila Play Protect bertanya, pilih "Tetap instal".
2. Buka **SPLV app**, ketik **kode siswa** (mis. `S01`), centang persetujuan, lalu tekan **Mulai belajar**.
3. Selesai. Semua materi, latihan, dan timbangan berjalan **tanpa internet**.
4. Data penelitian: Peta Belajar → ikon ⚙ → buat PIN peneliti → **Ekspor CSV**, lalu kirim filenya ke laptop.

Bagian di bawah ini **opsional**, hanya bila ingin data otomatis masuk ke dashboard guru.

---

## 0. Opsional: dashboard guru lewat internet

Jalankan di PowerShell, folder `server` (laptop harus terhubung internet):

```powershell
.venv\Scripts\activate
pip install -r requirements.txt
python -m scripts.init_env          # SEKALI: mode produksi + secret acak (server/.env)
python -m scripts.create_class --code VIIA --name "VII-A" --teacher guru@sekolah.sch.id --pin 864213 --students 32
python -m scripts.online            # biarkan jendela ini tetap terbuka
```

`online` mencetak alamat publik seperti **`https://kata-acak.trycloudflare.com`**:

- **Link unduh APK** (bisa dibuka dari HP mana pun, pakai data seluler juga bisa): `<alamat>/download`
- **Dashboard guru**: `<alamat>/dashboard/`
- **Alamat server di aplikasi** (halaman login): `<alamat>`

Sertifikatnya resmi (dari Cloudflare), jadi tidak ada peringatan "koneksi tidak privat".

Hal yang perlu diketahui:
- Alamat **berubah setiap kali `online` dijalankan ulang**. Siswa yang sudah login cukup memperbarui alamat
  di menu peneliti (⚙), dan data lokalnya tetap aman lalu terkirim setelah alamat diperbarui.
  Untuk alamat **tetap**, gunakan Cloudflare *Named Tunnel* (akun Cloudflare + domain) atau hosting (Render/VPS).
- Server hanya hidup selama laptop menyala dan jendela `online` terbuka.
- Lalu lintas melewati Cloudflare (terenkripsi HTTPS ke HP). Sebutkan hal ini di lembar persetujuan penelitian.
- **Kode kelas** (mis. `VIIA-P4J7`) memakai akhiran acak. Jangan dipublikasikan di luar kelas.

### Pengamanan yang aktif di mode produksi
| Ancaman | Perlindungan |
|---|---|
| Secret default bocor | Server menolak start bila JWT secret/admin key masih default |
| Menebak PIN guru | PIN minimal 6 karakter; akun terkunci 15 menit setelah 5 PIN salah; maksimal 10 kegagalan per IP |
| Menebak kode kelas/siswa | Akhiran acak pada kode kelas; join dibatasi 10 percobaan / 10 menit per IP |
| Banjir data palsu | Batas 120 unggahan/menit, payload ≤ 4 KB per event, body ≤ 1 MB |
| Endpoint admin dari internet | Dimatikan (`SPLV_ADMIN_API=false`); kelas dibuat lewat skrip di laptop |
| Clickjacking / XSS / sniffing | Header CSP, X-Frame-Options DENY, nosniff, HSTS, no-referrer |
| Dokumentasi API terbuka | `/docs` dan `/openapi.json` dimatikan |
| Server diakses langsung di WiFi | Di mode `online`, FastAPI hanya mendengarkan `127.0.0.1` |
| Data aplikasi disalin lewat backup | `allowBackup=false` di APK |
| HTTP polos / server palsu | APK hanya HTTPS; sertifikat diverifikasi stack native Android |

## A. Alternatif: server di WiFi sekolah (tanpa internet)

1. Laptop dan HP siswa tersambung ke **WiFi yang sama** (atau hotspot laptop).
2. Buka PowerShell di folder `server`:
   ```powershell
   .venv\Scripts\activate
   python -m scripts.make_certs                 # buat/perbarui sertifikat untuk IP laptop saat ini
   python -m scripts.create_class --code VIIA --name "VII-A" --teacher guru@sekolah.sch.id --pin 2468 --students 32
   python -m scripts.serve                      # server HTTPS di port 8443
   ```
3. `make_certs` mencetak alamat untuk HP, mis. **`https://192.168.1.10:8443`**.
   - **Pindah sekolah / WiFi baru (IP laptop berubah)?** Cukup jalankan ulang `python -m scripts.make_certs`,
     lalu `scripts.serve`. **APK tidak perlu di-build ulang**, karena HP sudah mempercayai CA lokal SPLV app.
   - IP bisa ditentukan manual: `python -m scripts.make_certs --ip 192.168.1.10`.
4. Jika HP tidak bisa terhubung, izinkan Python di Windows Firewall (jaringan *Private*), port 8443.
5. Catat kode siswa (S01–S32) dan bagikan ke siswa **tanpa menuliskan nama di aplikasi**.
   Daftar pasangan nama ↔ kode disimpan peneliti secara terpisah, tidak di repo.

### Server di internet (opsional)
Jika server dipasang di hosting dengan domain sendiri, gunakan sertifikat publik (mis. Let's Encrypt lewat
Caddy/Nginx di depan `uvicorn app.main:app --port 8000`). APK sudah mempercayai CA publik, jadi alamatnya cukup
diisi `https://domain-anda`.

## B. Pasang APK di HP siswa

**Cara tercepat (link + QR):** saat server berjalan, buka **`https://<IP-laptop>:8443/download`** di laptop,
tampilkan di proyektor, lalu siswa memindai QR dengan HP (WiFi yang sama) dan menekan **Unduh APK**.
Halaman ini selalu menyajikan APK terbaru dari folder `apk/` beserta SHA-256-nya.

Cara lain:

1. Kirim **`apk/SPLV-app-1.4.1.apk`** lewat WhatsApp/Drive/kabel.
2. Di HP, buka file tersebut, lalu izinkan **"Instal aplikasi tidak dikenal"** bila diminta.
3. Play Protect mungkin bertanya karena aplikasi tidak dari Play Store. Pilih **Tetap instal**.
   APK ini adalah **rilis bertanda tangan**. Pembaruan berikutnya harus ditandatangani dengan kunci yang sama
   (lihat bagian G).

## C. Login pertama (sekali per HP)

1. Buka **SPLV app**, lalu ketuk **"Terhubung ke dashboard guru (opsional)"** dan isi kode kelas + alamat server.
   Alamat `http://` ditolak demi keamanan data siswa.
2. Isi **Kode kelas** (VIIA) dan **Kode siswa** (mis. S07).
3. Persetujuan orang tua/wali dikumpulkan di luar aplikasi (lembar kertas) sebelum siswa ikut.
4. Siswa mengerjakan **Cek kesiapan** (8 soal, sekitar 5 menit).

Tanpa WiFi pun siswa tetap bisa login dan belajar. Datanya terkirim otomatis saat server terjangkau.

## D. Menu peneliti di HP (ikon ⚙ di Peta Belajar)

- Pertama kali dibuka, buat PIN peneliti (4–8 angka). PIN berlaku per HP.
- **Alamat server**: ubah di sini bila IP laptop berubah.
- **Kuesioner beban kognitif di akhir level**: aktifkan saat pengambilan data.
- **Buka semua level**: untuk validasi ahli/demonstrasi saja. Matikan saat uji coba siswa.
- **Mode ringan (2D)**: untuk HP yang lambat.
- **Ekspor CSV/JSON**: cadangan data bila sinkron gagal.

## E. Dashboard guru

- Buka `https://192.168.1.10:8443/dashboard/` di browser laptop, lalu login dengan email + PIN guru.
- Browser akan memperingatkan "koneksi tidak privat" karena CA-nya lokal. Pilih salah satu:
  - klik **Lanjutan → Lanjutkan** (cukup untuk laptop peneliti sendiri), atau
  - pasang `server\certs\ca.crt` ke Windows: klik dua kali → *Install Certificate* → *Local Machine* →
    *Trusted Root Certification Authorities*. Peringatan pun hilang.
- Tekan **Muat ulang** untuk melihat siswa yang macet dan kesalahan dominan.

## F. Setelah sesi

- Unduh **CSV** dari dashboard: berisi data aktivitas per kode siswa untuk analisis.
- Cadangkan file `server/splv.db`.
- Jangan unggah data siswa ke layanan AI/online mana pun.

## G. ⚠ File rahasia yang WAJIB dicadangkan

Simpan salinan di flashdisk/penyimpanan pribadi terenkripsi. **Jangan** kirim lewat chat, jangan commit ke Git.

| File | Gunanya | Jika hilang |
|---|---|---|
| `app/android/keystore/splv-release.jks` + `app/android/keystore.properties` | Menandatangani APK rilis | Pembaruan APK **tidak bisa** dipasang di atas versi lama. Siswa harus uninstall dulu, dan data lokal yang belum tersinkron ikut hilang |
| `server/certs/ca.key` + `server/certs/ca.crt` | CA lokal yang dipercaya APK | Harus buat CA baru **dan** build + pasang ulang APK di semua HP |
| `server/.env` | Secret JWT & kunci admin | Semua siswa harus login ulang |

Siapa pun yang memegang `ca.key` bisa menyamar sebagai server Anda di jaringan yang sama, jadi simpan baik-baik.

## H. Build ulang APK (setelah mengubah soal/kode)

```powershell
powershell -ExecutionPolicy Bypass -File app\scripts\build-apk.ps1
```
Naikkan `version` di `app/package.json` dan `versionCode`/`versionName` di `app/android/app/build.gradle`
sebelum membagikan versi baru.

## I. Jika ada masalah di HP

| Gejala | Penyebab | Solusi |
|---|---|---|
| Tidak bisa dipasang ("aplikasi tidak terpasang") | Versi lama dari sumber lain / Android < 5.1 | Uninstall versi lama lalu pasang lagi. Butuh Android 5.1+ |
| Layar putih / tulisan "Aplikasi gagal dimuat" | Android System WebView sangat lama | Perbarui **Android System WebView** dan **Chrome** di Play Store |
| Dulu: "SPLV app has stopped" saat membuka level | Driver GPU HP crash saat timbangan 3D dibuat | **Sudah diperbaiki sejak 1.1.0**: HP dengan WebView lama otomatis memakai timbangan 2D; bila pernah crash, aplikasi ingat dan memakai 2D |
| Timbangan terlihat datar (2D), bukan 3D | Perlindungan di atas aktif | Normal. Setelah WebView diperbarui: ⚙ → **Coba lagi timbangan 3D** |
| Terasa lambat | HP kelas bawah | ⚙ → aktifkan **Mode ringan (timbangan 2D)** |

Jika masih ada error, foto layar pesan yang muncul (aplikasi sekarang menampilkan pesan, bukan layar kosong) dan
catat merek/tipe HP + versi Android.

## Batasan versi 1.4.1

- Sudah diuji di **emulator Android 8.0 (WebView 69)**: pasang, login, diagnostik, peta belajar, level L0 dengan timbangan 2D, tanpa crash.
  Belum diuji di HP fisik. Lakukan uji perorangan (task.md T-I02) sebelum uji kelas.
- Blok hitam di layar pada WebView lama **sudah diperbaiki di 1.1.1** (WebView < Chrome 90 digambar dengan render perangkat lunak).
- Butir kuesioner beban kognitif dan soal-soal **belum divalidasi ahli** (task.md T-D03, T-D07, T-I01).
