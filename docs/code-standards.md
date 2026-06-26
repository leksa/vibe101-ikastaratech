# Code & Development Standards — data-bgn

Standar minimal untuk menjaga kode konsisten dan minim bug.

## Umum

- **Bahasa**: istilah domain & komentar pakai Bahasa Indonesia (provinsi, kabkota,
  kecamatan, peserta didik). Nama variabel teknis boleh Inggris.
- **Satu sumber-kebenaran** untuk aturan domain. Rumus coverage hanya di
  `backend/lib/coverage.js`. Jangan hardcode angka 2000 / 70 / 90 di tempat lain.
- **Diagnostic Gate** wajib sebelum tes browser: LSP → `node --test` → browser.
  (Detail di CLAUDE.md.)
- File yang membesar = sinyal tanggung jawab terlalu banyak; pecah jadi unit fokus.

## Backend (Node/Express)

- ESM (`import`/`export`), `"type": "module"`.
- Semua handler `async` dengan `try/catch` + `res.status(500).json({ error })`.
- Query parameterized (`$1,$2,…`). Tidak ada string-concat input user ke SQL.
- Baca dari **view bersih `v_sppg`**, bukan tabel `sppg` mentah.
- Helper SQL bersama dipakai ulang, tidak diduplikasi.

## Frontend (Vue 3)

- Composition API + `<script setup>`.
- Data via `fetch('/api/...')`; konversi angka string dari Postgres sebelum dihitung.
- Warna & ambang tier konsisten dengan backend (merah/kuning/hijau).
- Komponen kecil, fokus; halaman lazy-loaded.

## SQL / Migrasi

- Idempoten: `IF NOT EXISTS`, `CREATE OR REPLACE VIEW`, `ON CONFLICT DO NOTHING`.
- Jalankan berurutan: setup → 02_clean_provinsi → import → analysis_views.

## Testing

- Logika bisnis murni → unit test `node:test` di `backend/tests/`.
- Tiap perbaikan bug menambah test yang menangkap bug itu.

## Review

- Sebelum mengubah fungsi yang dipakai luas, cek blast radius:
  `code-review-graph detect-changes`.
- Tidak commit ke branch default langsung tanpa diminta.
