-- ============================================================
-- Setup PostgreSQL database for SPPG + DAPODIK analysis
-- Run: docker exec -i sppg-db psql -U postgres -d sppg < setup_db.sql
-- ============================================================

-- 1. Tabung SPPG
CREATE TABLE IF NOT EXISTS sppg (
    id SERIAL PRIMARY KEY,
    provinsi TEXT,
    kabkota TEXT,
    kecamatan TEXT,
    desa TEXT,
    kode_wilayah_bps TEXT,
    kode_kecamatan_bps TEXT GENERATED ALWAYS AS (
        LEFT(REPLACE(kode_wilayah_bps, '.', ''), 8)
    ) STORED,
    nama_sppg TEXT,
    alamat TEXT
);

-- 2. Tabung DAPODIK peserta didik per kecamatan
CREATE TABLE IF NOT EXISTS dapodik_pd (
    id SERIAL PRIMARY KEY,
    provinsi TEXT,
    kabkota TEXT,
    kecamatan TEXT,
    kode_wilayah_dapodik TEXT,
    total_pd INTEGER,
    total_pd_laki INTEGER,
    total_pd_perempuan INTEGER,
    tk_pd INTEGER DEFAULT 0,
    tk_pd_laki INTEGER DEFAULT 0,
    tk_pd_perempuan INTEGER DEFAULT 0,
    kb_pd INTEGER DEFAULT 0,
    kb_pd_laki INTEGER DEFAULT 0,
    kb_pd_perempuan INTEGER DEFAULT 0,
    tpa_pd INTEGER DEFAULT 0,
    tpa_pd_laki INTEGER DEFAULT 0,
    tpa_pd_perempuan INTEGER DEFAULT 0,
    sps_pd INTEGER DEFAULT 0,
    sps_pd_laki INTEGER DEFAULT 0,
    sps_pd_perempuan INTEGER DEFAULT 0,
    pkbm_pd INTEGER DEFAULT 0,
    pkbm_pd_laki INTEGER DEFAULT 0,
    pkbm_pd_perempuan INTEGER DEFAULT 0,
    skb_pd INTEGER DEFAULT 0,
    skb_pd_laki INTEGER DEFAULT 0,
    skb_pd_perempuan INTEGER DEFAULT 0,
    sd_pd INTEGER DEFAULT 0,
    sd_pd_laki INTEGER DEFAULT 0,
    sd_pd_perempuan INTEGER DEFAULT 0,
    smp_pd INTEGER DEFAULT 0,
    smp_pd_laki INTEGER DEFAULT 0,
    smp_pd_perempuan INTEGER DEFAULT 0,
    sma_pd INTEGER DEFAULT 0,
    sma_pd_laki INTEGER DEFAULT 0,
    sma_pd_perempuan INTEGER DEFAULT 0,
    smk_pd INTEGER DEFAULT 0,
    smk_pd_laki INTEGER DEFAULT 0,
    smk_pd_perempuan INTEGER DEFAULT 0,
    slb_pd INTEGER DEFAULT 0,
    slb_pd_laki INTEGER DEFAULT 0,
    slb_pd_perempuan INTEGER DEFAULT 0
);

-- 3. Tabung mapping kecamatan BPS <-> DAPODIK
CREATE TABLE IF NOT EXISTS kecamatan_mapping (
    id SERIAL PRIMARY KEY,
    kode_kecamatan_bps TEXT,
    kode_wilayah_dapodik TEXT,
    provinsi_sppg TEXT,
    kabkota_sppg TEXT,
    kecamatan_sppg TEXT,
    provinsi_dapodik TEXT,
    kabkota_dapodik TEXT,
    kecamatan_dapodik TEXT,
    match_method TEXT DEFAULT 'name_exact',
    UNIQUE (kode_kecamatan_bps, kode_wilayah_dapodik)
);

-- 4. Koordinat kecamatan (BPS code -> lat/lon) untuk peta
CREATE TABLE IF NOT EXISTS kecamatan_coords (
    id SERIAL PRIMARY KEY,
    kode_kecamatan_bps TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    match_method TEXT
);

-- 5. Koordinat kecamatan dari sumber Kemendagri (referensi alternatif)
CREATE TABLE IF NOT EXISTS district_coords (
    id SERIAL PRIMARY KEY,
    kode_kemendagri TEXT,
    nama_kecamatan TEXT,
    nama_kabkota TEXT,
    nama_provinsi TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION
);

-- Index
CREATE INDEX IF NOT EXISTS idx_sppg_kode_kec ON sppg(kode_kecamatan_bps);
CREATE INDEX IF NOT EXISTS idx_kec_coords_bps ON kecamatan_coords(kode_kecamatan_bps);
CREATE INDEX IF NOT EXISTS idx_sppg_prov_kab_kec ON sppg(provinsi, kabkota, kecamatan);
CREATE INDEX IF NOT EXISTS idx_dapodik_prov_kab_kec ON dapodik_pd(provinsi, kabkota, kecamatan);
CREATE INDEX IF NOT EXISTS idx_kec_mapping_bps ON kecamatan_mapping(kode_kecamatan_bps);
CREATE INDEX IF NOT EXISTS idx_kec_mapping_dapodik ON kecamatan_mapping(kode_wilayah_dapodik);
