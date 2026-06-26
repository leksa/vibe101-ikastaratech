# Infrastructure

Komponen non-aplikasi: database, reverse proxy, container.

## Isi

| File | Fungsi |
|------|--------|
| `docker-compose.yml` | Postgres 16 (`sppg-db`) di port `5435`, db `sppg`. |
| `nginx/sppg.conf` | Reverse proxy produksi: static frontend + `/api` → Express `:3000`. |

## Database

```bash
docker compose up -d            # start Postgres
docker compose ps               # cek status / health
docker compose logs -f sppg-db  # log
docker compose down             # stop (data tetap di volume sppg_pgdata)
docker compose down -v          # stop + HAPUS data
```

Setelah DB hidup, inisialisasi skema & data: lihat skill `db-migrations` /
`sppg-data-pipeline` dan `script/sql/`.

Kredensial (cocok dengan `backend/api/db.js`, override lewat env):
`host=localhost port=5435 db=sppg user=postgres password=sppg`.

## Deploy

Lihat `docs/deployment-rules.md`.
