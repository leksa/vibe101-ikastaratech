-- Analysis views: SPPG vs student population per kecamatan

-- 1. SPPG aggregate per kecamatan
-- Reads from v_sppg (valid-province clean view, see 02_clean_provinsi.sql)
CREATE OR REPLACE VIEW v_sppg_per_kecamatan AS
SELECT
    kode_kecamatan_bps,
    provinsi,
    kabkota,
    count(*) AS jumlah_sppg
FROM v_sppg
GROUP BY kode_kecamatan_bps, provinsi, kabkota;

-- 2. Full analysis: SPPG + student data side by side
CREATE OR REPLACE VIEW v_analisis_sppg_pd AS
SELECT
    COALESCE(m.kode_kecamatan_bps, s.kode_kecamatan_bps) AS kode_kecamatan_bps,
    COALESCE(m.provinsi_sppg, s.provinsi) AS provinsi,
    COALESCE(m.kabkota_sppg, s.kabkota) AS kabkota,
    COALESCE(m.kecamatan_sppg, '') AS kecamatan_sppg,
    COALESCE(m.kecamatan_dapodik, '') AS kecamatan_dapodik,
    COALESCE(s.jumlah_sppg, 0) AS jumlah_sppg,
    COALESCE(d.total_pd, 0) AS total_pd,
    COALESCE(d.sd_pd, 0) AS sd_pd,
    COALESCE(d.smp_pd, 0) AS smp_pd,
    COALESCE(d.sma_pd, 0) AS sma_pd,
    COALESCE(d.smk_pd, 0) AS smk_pd,
    COALESCE(d.slb_pd, 0) AS slb_pd,
    COALESCE(d.tk_pd, 0) AS tk_pd,
    COALESCE(d.kb_pd, 0) AS kb_pd,
    COALESCE(m.match_method, 'unmatched') AS match_method,
    CASE
        WHEN d.total_pd > 0 THEN ROUND(s.jumlah_sppg::numeric / d.total_pd * 10000, 2)
        ELSE NULL
    END AS sppg_per_10k_siswa,
    CASE
        WHEN d.total_pd > 0 THEN ROUND(d.total_pd::numeric / NULLIF(s.jumlah_sppg, 0), 0)
        ELSE NULL
    END AS siswa_per_sppg
FROM v_sppg_per_kecamatan s
FULL JOIN kecamatan_mapping m ON m.kode_kecamatan_bps = s.kode_kecamatan_bps
LEFT JOIN dapodik_pd d ON d.kode_wilayah_dapodik = m.kode_wilayah_dapodik;

-- 3. Summary per provinsi
CREATE OR REPLACE VIEW v_summary_provinsi AS
SELECT
    provinsi,
    count(*) AS jumlah_kecamatan,
    sum(jumlah_sppg) AS total_sppg,
    sum(total_pd) AS total_pd,
    sum(sd_pd) AS total_sd,
    sum(smp_pd) AS total_smp,
    sum(sma_pd) AS total_sma,
    sum(smk_pd) AS total_smk,
    ROUND(AVG(sppg_per_10k_siswa), 2) AS avg_sppg_per_10k_siswa,
    ROUND(AVG(siswa_per_sppg), 0) AS avg_siswa_per_sppg
FROM v_analisis_sppg_pd
GROUP BY provinsi
ORDER BY provinsi;

-- 4. Top/bottom kecamatan by SPPG coverage
CREATE OR REPLACE VIEW v_top_kecamatan AS
SELECT * FROM v_analisis_sppg_pd
WHERE match_method != 'unmatched' AND total_pd > 0
ORDER BY sppg_per_10k_siswa DESC;

CREATE OR REPLACE VIEW v_bottom_kecamatan AS
SELECT * FROM v_analisis_sppg_pd
WHERE match_method != 'unmatched' AND total_pd > 0 AND jumlah_sppg > 0
ORDER BY sppg_per_10k_siswa ASC;
