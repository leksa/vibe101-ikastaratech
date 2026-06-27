# Dashboard Coverage SPPG — Vibe Coding 101

Dashboard untuk memantau **kecukupan (coverage) dapur SPPG** (Satuan Pelayanan
Pemenuhan Gizi, program **Makan Bergizi Gratis / MBG**) terhadap **populasi penerima**
(peserta didik KB–TK–SD dari DAPODIK) di tiap kecamatan se-Indonesia.

Repo ini sekaligus menjadi bahan tutorial **"Vibe Coding 101 — Ikastaratech"**: contoh
nyata membangun aplikasi end-to-end bersama AI agent (Claude Code) dengan struktur,
skill, MCP, dan disiplin pengujian yang rapi.

> 🔗 Materi presentasi: `presentation/index.html` (atau `presentation/Vibe-Coding-101-Ikastaratech.pdf`)

---

## ✨ Fitur

- **Overview nasional** — total SPPG, kecamatan, kabupaten/kota, provinsi, dan penerima sasaran.
- **Analisis coverage** — perbandingan kapasitas SPPG vs penerima per kecamatan/kabkota/provinsi,
  ditandai 4 tingkat warna (merah / kuning / hijau muda / hijau tua).
- **Peta distribusi (Leaflet)** dengan 3 mode:
  - Titik SPPG diwarnai tier coverage, lengkap **slider simulasi kapasitas** (porsi/SPPG/hari).
  - **Choropleth stunting** per provinsi (data SSGI/SKI 2024).
  - Overlay keduanya.
- **Data SPPG & Peserta Didik** — tabel dengan pencarian, filter, dan paginasi.
- **Ekspor CSV** (Laporan).

---

## 🧩 Tech Stack

| Lapisan | Teknologi |
|---------|-----------|
| Frontend | Vue 3 (Composition API) · Vite · Tailwind CSS · Leaflet · Chart.js |
| Backend | Node.js · Express · `pg` (PostgreSQL) — ESM |
| Database | PostgreSQL 16 (Docker) |
| Pipeline data | Python & Node (scraping) → CSV → PostgreSQL |
| Tooling agent | Claude Code · code-review-graph (MCP) · typescript-lsp · Playwright |

---

## 📁 Struktur Proyek

```
data-bgn/
├── CLAUDE.md             # peta proyek + aturan agent + diagnostic gate
├── .mcp.json             # konfigurasi MCP (code-review-graph)
├── .claude/skills/       # skill spesifik proyek (node-express-api, vue-dashboard-ui, dst)
├── backend/              # API Express + pg
│   ├── server.js  api/{db,routes}.js  lib/coverage.js  tests/
├── frontend/             # Vue 3 + Vite
│   ├── src/{pages,components}  public/geo/   # geojson 38 provinsi
├── infrastructure/       # docker-compose (Postgres) + nginx
├── script/               # pipeline data (scrape, clean) + SQL (script/sql)
├── docs/                 # standar kode, SRS, proses bisnis, ERD/flow (mermaid), reference
├── presentation/         # slide deck (HTML + PDF)
└── _archive/             # file lama (diabaikan)
```

---

## 🚀 Menjalankan (Development)

Prasyarat: **Node.js ≥ 18**, **Docker**, dan (untuk pipeline) **Python 3**.

```bash
# 1. Database — PostgreSQL di port 5435
cd infrastructure && docker compose up -d

# 2. Inisialisasi skema & data (lihat docs skill db-migrations / sppg-data-pipeline)
#    setup_db.sql → 02_clean_provinsi.sql → import_data.sql → analysis_views.sql → 03_stunting.sql

# 3. Backend API  → http://localhost:3000
cd backend && npm install && npm run dev

# 4. Frontend     → http://localhost:5173  (proxy /api → :3000)
cd frontend && npm install && npm run dev
```

**Produksi:** `cd frontend && npm run build`, lalu `cd backend && npm start`
(Express menyajikan `frontend/dist`). Reverse proxy opsional: `infrastructure/nginx/sppg.conf`.

Konfigurasi DB via environment (default cocok dengan `docker-compose.yml`):
`PGHOST=localhost PGPORT=5435 PGDATABASE=sppg PGUSER=postgres PGPASSWORD=sppg`.

---

## 🔌 API

| Endpoint | Keterangan |
|----------|------------|
| `GET /api/stats` | Ringkasan nasional |
| `GET /api/sppg` | Daftar SPPG (cari, filter provinsi/kabkota, paginasi) |
| `GET /api/kecamatan` | Coverage per kecamatan + tier + koordinat |
| `GET /api/coverage[/provinsi\|/kabkota]` | Agregat coverage |
| `GET /api/coverage/detail/:kode` | SPPG dalam satu kecamatan |
| `GET /api/peserta-didik` | Data peserta didik per kecamatan |
| `GET /api/distribusi` | Distribusi SPPG per provinsi |
| `GET /api/stunting` | Prevalensi stunting per provinsi |
| `GET /api/filter-options` | Opsi filter (provinsi, kabkota) |

---

## 📐 Aturan Domain

- **Penerima sasaran** (KB–TK–SD) = `tk + kb + tpa + sps + sd`.
- **Kapasitas** = `jumlah_sppg × 2000` porsi/hari (parameter, di `backend/lib/coverage.js`).
- **Coverage %** = `kapasitas / penerima × 100`.
- **Tier**: `<70` merah · `70–89` kuning · `90–100` hijau muda · `>100` hijau tua.
- Selalu query dari view **`v_sppg`** (38 provinsi valid, sudah dibersihkan).

Detail: `docs/business-process.md`, `docs/SRS.md`, dan ERD `docs/diagrams/erd.mmd`.

---

## ✅ Standar Pengembangan (Diagnostic Gate)

Setiap perubahan kode aplikasi melewati gerbang ini **sebelum** tes browser:

1. **LSP diagnostics** pada file yang diubah.
2. **Unit test backend**: `cd backend && node --test`.
3. **Tes browser** (Playwright / Chrome).

`code-review-graph` (MCP) melacak graf dependensi untuk cek blast-radius sebelum
mengubah fungsi inti. Lihat `docs/code-standards.md`.

---

## 🗂️ Sumber Data

- **SPPG** — auditsppg / SPPG Indonesia 2026.
- **Peserta didik** — DAPODIK (per kecamatan, per jenjang).
- **Stunting** — SSGI/SKI 2024 (`docs/reference/`).
- **Polygon provinsi** — [indonesia-geojson 38 provinsi](https://github.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces) (CC BY 4.0).

> ⚠️ Data bersifat sementara/prototipe dan akan diperbarui berkala.

---

## 📊 Status

Aplikasi ~90% jalan (prototipe). Lihat `docs/SRS.md` untuk daftar kebutuhan & status.

---

## 📬 Kontak

**Rizal** — [rizal@jakartacomplexity.com](mailto:rizal@jakartacomplexity.com)
Jakarta Complexity

---

## 📄 Lisensi

Belum ditentukan (internal / materi tutorial). Polygon provinsi mengikuti lisensi
sumbernya (CC BY 4.0).
