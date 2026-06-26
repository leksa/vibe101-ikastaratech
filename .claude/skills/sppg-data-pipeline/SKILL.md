---
name: sppg-data-pipeline
description: Use when scraping, cleaning, mapping, or importing the SPPG/DAPODIK data in this repo (script/*.py, script/*.mjs, script/data, script/sql/import_data.sql). Covers the CSV→Postgres flow and known data-quality issues.
---

# SPPG Data Pipeline — konvensi repo data-bgn

Alur: scrape → CSV mentah → clean/remap → CSV bersih → COPY ke Postgres → view analisis.

## Lokasi

- Scraper: `script/scrape_*.py`, `script/scrape_*.mjs`
- Clean/remap & mapping wilayah: `script/clean_and_remap.py`, `script/map_wilayah.py`,
  `script/resume_dapodik_pd.py`
- CSV mentah sumber: `docs/reference/` (`dapodik_pd_kecamatan.csv`, `sppg_indonesia_2026.csv`)
- CSV bersih (input import) + lookup wilayah: `script/data/`
- SQL: `script/sql/` (`setup_db.sql`, `02_clean_provinsi.sql`, `import_data.sql`, `analysis_views.sql`)
- Orkestrasi: `script/run_pipeline.sh`

## Urutan import (DB fresh)

```bash
docker exec -i sppg-db psql -U postgres -d sppg < script/sql/setup_db.sql
docker exec -i sppg-db psql -U postgres -d sppg < script/sql/02_clean_provinsi.sql
# import_data.sql meng-COPY dari /tmp -> salin CSV bersih dulu:
docker cp script/data/sppg_clean.csv sppg-db:/tmp/sppg_clean.csv
docker cp script/data/dapodik_clean.csv sppg-db:/tmp/dapodik_clean.csv
docker exec -i sppg-db psql -U postgres -d sppg < script/sql/import_data.sql
docker exec -i sppg-db psql -U postgres -d sppg < script/sql/analysis_views.sql
```

## Catatan data-quality (PENTING)

- **Urutan kolom `COPY` di `import_data.sql` sengaja mengikuti urutan header CSV**
  (`...sps, pkbm, skb, sma, smk, slb, sd, smp`), bukan urutan definisi tabel. Jangan
  "rapikan" tanpa cek header CSV — bisa menggeser data sd/smp ke kolom salah.
- **Kolom `provinsi` di `sppg` punya ~26 baris kotor** (fragmen alamat). Bersih di lapis
  query via `ref_provinsi` + view `v_sppg`. Perbaikan akar (parser scrape) masih TODO —
  catat di `docs/business-process.md`.
- `kode_kecamatan_bps` dibuat otomatis (GENERATED) dari `kode_wilayah_bps`
  (8 digit pertama tanpa titik).

## Setelah mengubah pipeline

Verifikasi jumlah baris & sampel: `SELECT count(*) FROM v_sppg;` dan cek `total_provinsi`
di `/api/stats` tetap **38**.
