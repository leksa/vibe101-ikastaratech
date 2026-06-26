# Software Requirements Specification (SRS) — Dashboard SPPG

Versi ringkas. Status: aplikasi ~90% jalan.

## 1. Tujuan

Menyediakan dashboard untuk memantau kecukupan (coverage) dapur SPPG terhadap populasi
penerima MBG (peserta didik PAUD+SD) per kecamatan, kabkota, dan provinsi.

## 2. Pengguna

- Analis kebijakan / program MBG — melihat coverage & titik kekurangan.
- Operator data — verifikasi data SPPG & DAPODIK.

## 3. Kebutuhan fungsional

| ID | Kebutuhan | Endpoint | Status |
|----|-----------|----------|--------|
| F1 | Ringkasan statistik nasional (total SPPG, kecamatan, provinsi, penerima) | `/api/stats` | ✅ |
| F2 | Daftar SPPG dengan pencarian + filter provinsi/kabkota + paginasi | `/api/sppg` | ✅ |
| F3 | Distribusi SPPG per provinsi | `/api/distribusi` | ✅ |
| F4 | Coverage agregat + per provinsi + per kabkota | `/api/coverage*` | ✅ |
| F5 | Data peserta didik per kecamatan | `/api/peserta-didik` | ✅ |
| F6 | Detail SPPG per kecamatan (klik peta) | `/api/coverage/detail/:kode` | ✅ |
| F7 | Peta sebaran SPPG + warna tier coverage | (frontend Leaflet) | ✅ |
| F8 | Opsi filter (provinsi, kabkota) | `/api/filter-options` | ✅ |
| F9 | Laporan / ekspor | halaman Laporan | 🚧 |

## 4. Kebutuhan non-fungsional

- **Akurasi data**: hanya 38 provinsi valid yang ditampilkan (`v_sppg`).
- **Kinerja**: query coverage agregat < ~2 dtk pada ~24k SPPG / ~7k kecamatan.
- **Keandalan**: tiap endpoint menangani error DB tanpa men-crash server.
- **Keteruji**: rumus coverage punya unit test (`backend/tests`).
- **Portabilitas**: DB via Docker; konfigurasi via env.

## 5. Data

Lihat ERD (`docs/diagrams/erd.mmd`) dan proses bisnis (`docs/business-process.md`).

## 6. Di luar lingkup

- Autentikasi/otorisasi pengguna.
- Penulisan/editing data lewat UI (data read-only; perubahan lewat pipeline).
- Real-time update (data batch hasil scrape).
