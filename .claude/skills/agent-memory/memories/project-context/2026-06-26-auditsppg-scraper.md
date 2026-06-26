---
summary: "Session 2026-06-26: scraped 534/538 SPPG from auditsppg.id detail pages, replacing old dedup CSV. Key findings: Nominatim geocoding (no hardcoded coords), dedup corrupted Drien Rampak 3 entry, ~4 exact duplicates in source."
created: 2026-06-26
status: in-progress
tags: [data-bgn, auditsppg, scraper, SPPG, Aceh]
---

# Session: auditsppg.id scraper — 2026-06-26

## State Before

- `SPPG_Aceh_clean.csv` (95KB, 538 rows) — old deduplicated CSV, source unknown, no coordinate data
- `1 ACEH MBG.kml` — KML file with SPPG points (not explored yet)
- Wilayah reference CSVs: `provinsi.csv`, `kota_kab.csv`, `kecamatan.csv`, `desa.csv`, `wilayah_base.csv`

## What We Did

### 1. Explored auditsppg.id detail page structure
- URL: `https://auditsppg.id/sppg/{id}` (e.g., `/sppg/15024`)
- Uses **Leaflet** with **Nominatim geocoding** (OpenStreetMap) — no embedded lat/lng in HTML
- Map center coordinates obtained dynamically via `map._targets` Leaflet internals
- Address text is rendered server-side (available in HTML)

### 2. Coordinate extraction attempt
- Wrote browser script to extract Leaflet center coords from detail page
- Successfully got coordinates for one SPPG detail page
- Verified against Google Maps — auditsppg coordinates matched the correct location for "SPPG Johan Pahlawan Drien Rampak 3"

### 3. Discovered dedup corruption
- The old `SPPG_Aceh_clean.csv` had 538 entries (down from ~600+ raw SPPGs in Aceh)
- **Drien Rampak 3 lost**: The listing page shows only "Drien Rampak" (no number), but detail page shows "Drien Rampak 3". During dedup, this was merged/renamed to `"SPPG Aceh Barat Johan Pahlawan Drien Rampak"` with desa set to `"UJONG BAROH"` — which is a **different village** entirely. The original Drien Rampak 3 location is in desa Drien Rampak, not Ujong Baroh.
- Exact duplicates exist in source data: ~4 pairs of identical rows (same SPPG name, same address, same location)

### 4. Scraper development & execution
- Wrote `scrape_auditsppg.mjs` (3.5KB) — Node.js scraper using `fetch` + `cheerio`
- Scraped all SPPG listing pages from auditsppg.id (paginated), then each detail page
- **Result**: 534/538 scraped successfully, 4 failed (server errors) — fell back to existing CSV data for those 4
- **Output**: `SPPG_Aceh_auditsppg_2026-06-26T08-43-35.csv` (539 lines = 1 header + 538 data rows)
- Fields: No, Nama SPPG, Provinsi, Kab/Kota, Kecamatan, Desa/Kelurahan, Alamat

### 5. Data quality findings
- "Bada Raya" vs "Banda Raya" — auditsppg name has typo ("Bada Raya" missing 'n'), but kecamatan column is correct ("BANDA RAYA"). Pre-existing issue, not from scraper.
- 4 exact duplicate pairs in source data (same SPPG name + address appearing twice):
  - Pidie Mutiara Timur Jojo (rows 489, 491)
  - Bener Meriah Bandar Keramat Jaya (rows 306, 307)
  - Aceh Utara Tanah Luas Rayeuk Meunye (rows 302, 305)
  - Aceh Utara Meurah Mulia Beuringen (rows 276, 277)

## What's Left

1. **Coordinate enrichment**: The new CSV has no lat/lng. Need to extract from:
   - Option A: Nominatim geocoding each address (slow, rate-limited)
   - Option B: Parse Leaflet `_targets` via puppeteer/Playwright for each detail page (reliable but slow)
   - Option C: Use the existing KML file (`1 ACEH MBG.kml`) which may have coordinates
2. **Dedup fix**: Reconcile Drien Rampak 3 identity — is it truly in Ujong Baroh or Drien Rampak village? Verify via Google Maps or Nominatim.
3. **Deduplicate the 4 exact duplicate rows** from the new CSV
4. **Reconcile with KML**: Compare KML point coordinates with CSV data

## Key Files

| File | Path |
|---|---|
| Old CSV | `SPPG_Aceh_clean.csv` |
| New scraped CSV | `SPPG_Aceh_auditsppg_2026-06-26T08-43-35.csv` |
| Scraper script | `scrape_auditsppg.mjs` |
| KML | `1 ACEH MBG.kml` |
| Wilayah data | `wilayah_base.csv`, `desa.csv`, `kecamatan.csv`, `kota_kab.csv`, `provinsi.csv` |

## Commands

```bash
# Run scraper again (idempotent — only appends if file exists check is added)
node scrape_auditsppg.mjs

# Check data
column -t -S',' SPPG_Aceh_auditsppg_*.csv | head
```
