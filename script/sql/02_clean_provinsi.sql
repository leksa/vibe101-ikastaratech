-- ============================================================
-- Data-quality fix: dirty `provinsi` values in `sppg`
--
-- ~26 scraped rows have address fragments in the provinsi column
-- (e.g. 'GANG KELAPA GADING', 'NO. 595', 'RT 008 RW 000',
-- 'KABUPATEN JAYAPURA 99352'). The old guard `provinsi NOT SIMILAR
-- TO '[0-9]+%'` only caught numeric-prefixed junk, so total_provinsi
-- reported 61 instead of the real 38.
--
-- Fix here is at the QUERY layer: a canonical province whitelist
-- plus a clean view. Root cause (scrape/mapping) is documented in
-- docs/business-process.md for a future pipeline fix.
-- ============================================================

-- 38 official Indonesian provinces (2024+)
CREATE TABLE IF NOT EXISTS ref_provinsi (
    nama_provinsi TEXT PRIMARY KEY
);

INSERT INTO ref_provinsi (nama_provinsi) VALUES
 ('ACEH'),('BALI'),('BANTEN'),('BENGKULU'),('DAERAH ISTIMEWA YOGYAKARTA'),
 ('DKI JAKARTA'),('GORONTALO'),('JAMBI'),('JAWA BARAT'),('JAWA TENGAH'),
 ('JAWA TIMUR'),('KALIMANTAN BARAT'),('KALIMANTAN SELATAN'),('KALIMANTAN TENGAH'),
 ('KALIMANTAN TIMUR'),('KALIMANTAN UTARA'),('KEPULAUAN BANGKA BELITUNG'),
 ('KEPULAUAN RIAU'),('LAMPUNG'),('MALUKU'),('MALUKU UTARA'),('NUSA TENGGARA BARAT'),
 ('NUSA TENGGARA TIMUR'),('PAPUA'),('PAPUA BARAT'),('PAPUA BARAT DAYA'),
 ('PAPUA PEGUNUNGAN'),('PAPUA SELATAN'),('PAPUA TENGAH'),('RIAU'),
 ('SULAWESI BARAT'),('SULAWESI SELATAN'),('SULAWESI TENGAH'),('SULAWESI TENGGARA'),
 ('SULAWESI UTARA'),('SUMATERA BARAT'),('SUMATERA SELATAN'),('SUMATERA UTARA')
ON CONFLICT (nama_provinsi) DO NOTHING;

-- Canonical clean SPPG view: only rows with a valid province.
-- Every API query reads from v_sppg instead of repeating the guard.
CREATE OR REPLACE VIEW v_sppg AS
SELECT s.*
FROM sppg s
JOIN ref_provinsi r ON s.provinsi = r.nama_provinsi;
