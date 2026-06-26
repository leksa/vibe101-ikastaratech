-- Import clean CSVs into PostgreSQL

TRUNCATE sppg CASCADE;
TRUNCATE dapodik_pd CASCADE;

COPY sppg(provinsi, kabkota, kecamatan, desa, kode_wilayah_bps, nama_sppg, alamat)
FROM '/tmp/sppg_clean.csv' DELIMITER ',' CSV HEADER;

-- dapodik CSV has 'nama' column (kecamatan name) and 'kode_wilayah' (dapodik code)
COPY dapodik_pd(provinsi, kabkota, kecamatan, kode_wilayah_dapodik,
    total_pd, total_pd_laki, total_pd_perempuan,
    tk_pd, tk_pd_laki, tk_pd_perempuan,
    kb_pd, kb_pd_laki, kb_pd_perempuan,
    tpa_pd, tpa_pd_laki, tpa_pd_perempuan,
    sps_pd, sps_pd_laki, sps_pd_perempuan,
    pkbm_pd, pkbm_pd_laki, pkbm_pd_perempuan,
    skb_pd, skb_pd_laki, skb_pd_perempuan,
    sma_pd, sma_pd_laki, sma_pd_perempuan,
    smk_pd, smk_pd_laki, smk_pd_perempuan,
    slb_pd, slb_pd_laki, slb_pd_perempuan,
    sd_pd, sd_pd_laki, sd_pd_perempuan,
    smp_pd, smp_pd_laki, smp_pd_perempuan)
FROM '/tmp/dapodik_clean.csv' DELIMITER ',' CSV HEADER;

SELECT 'sppg' as tbl, count(*) as n FROM sppg
UNION ALL
SELECT 'dapodik_pd', count(*) FROM dapodik_pd;
