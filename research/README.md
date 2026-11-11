# splsv_research — alat penelitian SPLSV app (Python)

Paket Python untuk tahap **Implementation & Evaluation** ADDIE. Tanpa dependensi luar (Python 3.10+).

| Perintah | Kegunaan |
|---|---|
| `python -m splsv_research soal --level L2 L3 --n 5 --seed 1 --out lembar.html` | Lembar soal siap cetak + kunci jawaban langkah demi langkah |
| `python -m splsv_research selesaikan "3(x - 2) = 12"` | Langkah penyelesaian satu persamaan (logika sama dengan aplikasi) |
| `python -m splsv_research ngain nilai.csv` | N-gain (Hake) per siswa & kelas + uji-t berpasangan |
| `python -m splsv_research aiken validasi.csv --lo 1 --hi 5` | Aiken's V untuk validasi ahli materi/media |
| `python -m splsv_research log ekspor.csv --csv ringkasan.csv` | Ringkasan log belajar per siswa (kesalahan, hint, waktu, level) |
| `python -m splsv_research beban ekspor.csv` | Skor beban kognitif IL/EL/GL + Paas + α Cronbach |

Tambahkan `--out laporan.md` untuk menyimpan laporan.

## Format data
- **nilai.csv**: `kode,pretest,posttest`
- **validasi.csv**: `butir,ahli1,ahli2,...` (skor 1–5)
- **ekspor.csv / .json**: hasil ekspor aplikasi (⚙ → Ekspor CSV) atau dashboard guru (Unduh CSV)

Folder `contoh/` berisi **data sintetis** untuk mencoba perintah. Itu **bukan data siswa sungguhan**.

## Catatan metodologis
- Tes literasi pretest/posttest penelitian harus instrumen terpisah yang tervalidasi. Lembar dari `soal` cocok
  untuk latihan atau sebagai bank awal yang ditelaah ahli.
- Aiken's V dari sedikit ahli menggambarkan kesepakatan, bukan bukti validitas empiris.
- α Cronbach dari kelas kecil hanya deskriptif. Butir kuesioner beban kognitif masih perlu validasi.

## Uji
```bash
pip install pytest
python -m pytest -q
```
