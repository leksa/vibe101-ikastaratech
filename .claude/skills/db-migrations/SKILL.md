---
name: db-migrations
description: Use when changing the PostgreSQL schema or views for this repo (script/sql/*.sql, tables sppg/dapodik_pd/kecamatan_mapping/kecamatan_coords, views v_sppg/v_sppg_per_kecamatan). Covers ordering, idempotency, and applying against the live sppg-db container.
---

# DB Migrations — konvensi repo data-bgn

Database PostgreSQL di container `sppg-db` (port `5435`, db `sppg`). Semua DDL/view ada di
`script/sql/`. Tidak ada migration tool — file SQL dijalankan berurutan dan harus idempoten.

## File & urutan

1. `setup_db.sql` — tabel: `sppg`, `dapodik_pd`, `kecamatan_mapping`, `kecamatan_coords`,
   `district_coords` + index. Pakai `CREATE TABLE IF NOT EXISTS`.
2. `02_clean_provinsi.sql` — `ref_provinsi` (38 provinsi) + view `v_sppg`.
3. `import_data.sql` — `COPY` CSV ke tabel (lihat skill sppg-data-pipeline).
4. `analysis_views.sql` — view analisis (`v_sppg_per_kecamatan` baca dari `v_sppg`, dst).
5. `03_stunting.sql` — tabel `stunting_provinsi` (prevalensi stunting per provinsi, SSGI/SKI
   2024; provinsi UPPERCASE agar match `ref_provinsi`).

## Aturan

- **Idempoten**: `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE VIEW`,
  `INSERT ... ON CONFLICT DO NOTHING`. Aman dijalankan ulang.
- **View bertingkat**: `v_sppg` → `v_sppg_per_kecamatan` → `v_analisis_sppg_pd`. Kalau ubah
  kolom view dasar, jalankan ulang file analysis_views.sql.
- **Jangan** taruh angka domain (2000 porsi, ambang 70/90) di SQL sebagai sumber-kebenaran;
  itu milik `backend/lib/coverage.js`. SQL hanya meniru.

## Terapkan ke DB live

```bash
docker exec -i sppg-db psql -U postgres -d sppg < script/sql/<file>.sql
# verifikasi
docker exec -i sppg-db psql -U postgres -d sppg -c "\dt"
docker exec -i sppg-db psql -U postgres -d sppg -c "SELECT count(*) FROM v_sppg;"
```

Setelah migrasi: restart backend, smoke test `/api/stats` (`total_provinsi` harus 38),
dan jalankan `cd backend && node --test`.
