---
name: node-express-api
description: Use when adding or changing backend API endpoints in this repo (backend/api/routes.js, Express + pg). Covers query conventions, the v_sppg clean view, error handling, and the coverage business rule.
---

# Node/Express API — konvensi repo data-bgn

Backend = Express ESM + `pg`. Semua endpoint ada di `backend/api/routes.js`,
koneksi DB di `backend/api/db.js`, rumus domain di `backend/lib/coverage.js`.

## Aturan wajib

1. **Selalu query dari `v_sppg`, bukan tabel `sppg`.** `v_sppg` sudah difilter ke 38
   provinsi valid (`ref_provinsi`). Tabel `sppg` mentah punya ~26 baris kotor.
2. **Bungkus tiap handler dengan `try/catch`** dan balikan `res.status(500).json({ error: err.message })`.
   Pola: `console.error('GET /path error:', err)`.
3. **Parameterized query** (`$1, $2, …`) untuk semua input user — jangan string-concat
   nilai ke SQL.
4. **Rumus coverage hanya dari `lib/coverage.js`.** Konstanta `PORSI_PER_SPPG_PER_HARI`,
   `TIER_MERAH_MAX`, `TIER_KUNING_MAX` diimpor; SQL menirunya, jangan tulis angka 2000/70/90
   secara hardcode di tempat baru.
5. Helper SQL bersama (`COV`, `V`, `KC`, `DAPODIK_AGG`, `COVERAGE_PCT`) sudah ada di atas
   file — pakai ulang, jangan duplikat logika kecamatan/coverage.

## Pola handler

```js
router.get('/contoh', async (req, res) => {
  try {
    const r = await db.query(`SELECT ... FROM v_sppg ...`, [param])
    res.json(r.rows)
  } catch (err) {
    console.error('GET /contoh error:', err)
    res.status(500).json({ error: err.message })
  }
})
```

## Setelah mengubah backend (Diagnostic Gate)

1. LSP diagnostics file yang diubah (warning `req` tak terpakai = idiom Express, abaikan).
2. `cd backend && node --test` (tambah/ubah test di `backend/tests/` bila logika berubah).
3. Smoke test endpoint: `curl -s localhost:3000/api/<path>`.
4. Baru tes browser.

Cek dampak perubahan fungsi yang dipakai luas dengan `code-review-graph detect-changes`.
