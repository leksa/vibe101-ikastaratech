---
name: vue-dashboard-ui
description: Use when adding or changing frontend pages/components in this repo (frontend/src, Vue 3 + Vite + Tailwind + Leaflet + Chart.js). Covers routing, API calls, the coverage tier colors, and the build/verify loop.
---

# Vue Dashboard UI — konvensi repo data-bgn

Frontend = Vue 3 Composition API (`<script setup>`) + Vite + Tailwind. Halaman lazy-loaded
di `frontend/src/router.js`; layout di `App.vue` (Sidebar + `<router-view>`).

## Konvensi

1. **Halaman** baru → komponen di `frontend/src/pages/`, daftarkan route di `router.js`,
   tambah link di `components/Sidebar.vue`.
2. **Ambil data** dari API lewat `fetch('/api/...')` (vite dev mem-proxy `/api` → `:3000`).
   Angka dari Postgres sering berupa **string** — `Number(...)`/`parseFloat` sebelum hitung
   atau format.
3. **Warna tier coverage** dari Tailwind theme (`tailwind.config.js`):
   `coverage.low` (#ef4444 merah), `coverage.medium` (#eab308 kuning),
   `coverage.high` (#22c55e hijau). Map `tier`/`coverage_persen` dari API ke warna ini —
   ambang sama: `<70` merah, `70–89` kuning, `90–100` hijau muda, `>100` hijau tua.
4. **Peta** pakai Leaflet; marker/warna kecamatan ikut tier. Pastikan handle `lat/lon` null
   (banyak kecamatan tanpa koordinat).
5. Gunakan `@` alias untuk `src/` (sudah dikonfigurasi di `vite.config.js`).

## Endpoint yang tersedia

`/api/stats`, `/api/sppg` (paginasi + filter q/provinsi/kabkota), `/api/kecamatan`,
`/api/coverage`, `/api/coverage/provinsi`, `/api/coverage/kabkota`,
`/api/coverage/detail/:kode`, `/api/peserta-didik`, `/api/distribusi`, `/api/filter-options`.

## Setelah mengubah frontend (Diagnostic Gate)

1. LSP/Volar diagnostics pada `.vue` yang diubah.
2. `cd frontend && npm run build` — harus sukses (tangkap error template/import).
3. Tes browser: jalankan `npm run dev`, buka halaman, cek console bersih (Playwright/
   claude-in-chrome). Backend harus hidup di `:3000`.
