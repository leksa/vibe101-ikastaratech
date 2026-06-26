# Deployment Rules — data-bgn

## Lingkungan

| Env | DB | Backend | Frontend |
|-----|----|---------|----------|
| Dev | `sppg-db` Docker :5435 | `npm run dev` :3000 | Vite :5173 (proxy /api) |
| Prod | Postgres terkelola | `npm start` :3000 (serve dist) | Nginx static + /api proxy |

## Urutan deploy

1. **Database siap**: `cd infrastructure && docker compose up -d`, lalu jalankan migrasi
   SQL berurutan (setup → 02_clean_provinsi → import → analysis_views). Lihat skill
   `db-migrations`.
2. **Build frontend**: `cd frontend && npm ci && npm run build` → `frontend/dist`.
3. **Backend**: `cd backend && npm ci && npm start` (Express menyajikan `frontend/dist`
   + `/api`). Atau pasang `infrastructure/nginx/sppg.conf` di depan backend.
4. **Verifikasi**: `curl /api/stats` → `total_provinsi = 38`; buka dashboard, console bersih.

## Konfigurasi (env backend)

`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PORT` (default 3000).
Jangan commit kredensial produksi; pakai env/secret manager.

## Gate sebelum rilis

- [ ] `cd backend && node --test` hijau.
- [ ] `cd frontend && npm run build` sukses tanpa error.
- [ ] LSP diagnostics bersih untuk file yang diubah.
- [ ] Smoke test endpoint utama (`/api/stats`, `/api/coverage`, `/api/kecamatan`).
- [ ] `code-review-graph status` ter-update (graph mencerminkan kode terbaru).

## Git & GitHub

Remote: `origin` → https://github.com/leksa/vibe101-ikastaratech

```bash
git add -A
git commit -m "pesan"
git push -u origin main      # pertama kali
git push                     # selanjutnya
```

`_archive/`, `node_modules/`, dan `frontend/dist/` di-ignore (lihat `.gitignore`).

## Rollback

DB: gunakan backup volume `sppg_pgdata` (`pg_dump` sebelum migrasi besar).
App: stateless — redeploy versi sebelumnya. `docker compose down -v` MENGHAPUS data;
jangan dipakai di produksi tanpa backup.
