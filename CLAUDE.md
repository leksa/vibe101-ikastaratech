# data-bgn — Dashboard Coverage SPPG vs Penerima (DAPODIK)

Dashboard untuk membandingkan jumlah **dapur SPPG** (Satuan Pelayanan Pemenuhan Gizi,
program Makan Bergizi Gratis) dengan **populasi penerima** (peserta didik KB–TK–SD dari
DAPODIK) per kecamatan, lalu menghitung **coverage** dan menandai tiap kecamatan
merah / kuning / hijau di tabel dan peta.

> Repo ini juga jadi bahan tutorial "vibe coding" dengan Claude Code. Struktur folder,
> skill, MCP, dan diagnostic gate di bawah adalah bagian dari materi.

**Repository:** https://github.com/leksa/vibe101-ikastaratech (remote `origin`).
Materi presentasi "Vibe Coding 101 — Ikastaratech".

## Tech stack

| Lapis | Teknologi |
|-------|-----------|
| Frontend | Vue 3 (Composition API) + Vue Router + Vite + Tailwind + Leaflet + Chart.js |
| Backend | Node.js + Express + `pg` (PostgreSQL driver), ESM (`"type": "module"`) |
| Database | PostgreSQL 16 (container `sppg-db`, port `5435`, db `sppg`) |
| Pipeline data | Python + Node scrapers, CSV → Postgres (lihat `script/`) |
| Tooling Claude | code-review-graph (MCP), typescript-lsp, playwright, superpowers |

## Peta folder

```
backend/         API Express + pg
  server.js        bootstrap + static serve frontend/dist (prod)
  api/db.js        pool koneksi Postgres (env: PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD)
  api/routes.js    semua endpoint /api/*  (baca dari view v_sppg yang sudah bersih)
  lib/coverage.js  SUMBER-KEBENARAN rumus coverage (porsi, pct, tier)
  tests/           unit test node:test
frontend/        Vue 3 + Vite
  src/pages/       Overview, PetaDistribusi, DataSppg, PesertaDidik, AnalisisCoverage, Laporan
  src/components/  Sidebar
  public/geo/      indonesia-38.geojson (polygon provinsi, choropleth stunting)
infrastructure/  docker-compose (Postgres), nginx reverse-proxy
script/          pipeline data (scrape, clean, map) + SQL (script/sql) + hooks
docs/
  reference/       CSV sumber mentah + standar kode/SRS/proses bisnis
  diagrams/        mermaid: flow.mmd, erd.mmd
  superpowers/specs/  design doc
presentation/    slide HTML (index.html)
_archive/        file lama / cruft (jangan dipakai; aman dihapus)
```

## Cara menjalankan (dev)

```bash
# 1. Database (sekali; container biasanya sudah jalan)
cd infrastructure && docker compose up -d            # Postgres :5435

# 2. Backend API  -> http://localhost:3000
cd backend && npm install && npm run dev

# 3. Frontend     -> http://localhost:5173 (proxy /api -> :3000)
cd frontend && npm install && npm run dev
```

Prod: `cd frontend && npm run build`, lalu `cd backend && npm start` (Express menyajikan
`frontend/dist`).

## Alur data

```
scrape (auditsppg, dapodik) ->  CSV mentah (docs/reference)
  -> clean & remap (script/*.py)  ->  CSV bersih (script/data)
  -> COPY ke Postgres (script/sql/import_data.sql)
  -> view analisis (script/sql/analysis_views.sql + 02_clean_provinsi.sql)
  -> API /api/* (backend)  ->  Dashboard Vue (frontend)
```

Skema & view: `script/sql/setup_db.sql` → `02_clean_provinsi.sql` → `import_data.sql` →
`analysis_views.sql`. ERD di `docs/diagrams/erd.mmd`.

## Aturan domain penting

- **`PORSI_PER_SPPG_PER_HARI = 2000`** — satu SPPG diasumsikan melayani 2000 porsi/hari.
  Didefinisikan SEKALI di `backend/lib/coverage.js`; query SQL menirunya. Ubah di sana.
- **coverage %** = `(jumlah_sppg * 2000) / penerima_pd * 100`.
  Penerima sasaran (KB–TK–SD sederajat) = `tk + kb + tpa + sps + sd`.
  (SMP/SMA/SMK/SLB di luar cakupan.) Definisi tunggal: helper `COV` di `backend/api/routes.js`.
- **tier** (4 tingkat): `< 70` merah · `70–89` kuning · `90–100` hijau_muda · `> 100` hijau_tua
  (`TIER_MERAH_MAX` / `TIER_KUNING_MAX` / `TIER_HIJAU_MAX`).
- **`v_sppg`** = view SPPG yang sudah difilter ke 38 provinsi valid (`ref_provinsi`).
  Selalu query dari `v_sppg`, JANGAN dari tabel `sppg` mentah (ada ~26 baris kotor:
  fragmen alamat masuk ke kolom provinsi). Detail: `script/sql/02_clean_provinsi.sql`.

## Diagnostic Gate (WAJIB)

Setelah menulis/mengubah kode aplikasi, jalankan berurutan SEBELUM tes browser:

1. **LSP diagnostics** pada file yang diubah — perbaiki error & warning nyata.
   (Plugin `typescript-lsp` juga membaca file `.js`.) Catatan: parameter `req` yang
   tak terpakai pada handler Express adalah idiom yang benar, bukan bug.
2. **Unit test backend**: `cd backend && node --test` — harus hijau.
3. Baru jalankan **tes browser / Playwright** terhadap dashboard.

Hook `script/hooks/diagnostic-reminder.sh` mengingatkan langkah ini otomatis tiap edit
file `backend/*.js` / `frontend/*.{js,vue}`.

## code-review-graph (MCP)

Knowledge graph kode (Tree-sitter → SQLite) untuk telusur dependensi & blast-radius saat
review. Sudah terdaftar di `.mcp.json` dan auto-update via hook PostToolUse.

```bash
code-review-graph status              # statistik graph
code-review-graph detect-changes      # dampak perubahan (blast radius)
code-review-graph visualize           # HTML interaktif
```

Sebelum mengubah fungsi yang dipakai luas, cek dampaknya lewat tool graph dulu.

## Skill proyek (`.claude/skills/`)

`node-express-api`, `vue-dashboard-ui`, `sppg-data-pipeline`, `db-migrations` —
konvensi spesifik repo ini. Panggil yang relevan sebelum bekerja di lapis terkait.

## Konvensi

- Bahasa Indonesia untuk istilah domain (provinsi, kabkota, kecamatan, peserta didik) &
  komentar; nama variabel teknis boleh Inggris.
- Endpoint balikan JSON; angka dari Postgres sering string — parse di frontend bila perlu.
- Jangan menulis ke tabel `sppg`/`dapodik_pd` dari API (read-only). Perubahan data lewat
  pipeline + migration SQL di `script/sql`.
