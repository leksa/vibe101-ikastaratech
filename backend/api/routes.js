import { Router } from 'express'
import db from './db.js'
import { PORSI_PER_SPPG_PER_HARI, TIER_MERAH_MAX, TIER_KUNING_MAX, TIER_HIJAU_MAX } from '../lib/coverage.js'

const router = Router()

// Jumlah penerima sasaran per kecamatan: KB-TK-SD-SMP-SMA (sederajat).
// PAUD (tk+kb+tpa+sps) + sd + smp + sma + smk. SLB di luar cakupan (bukan jenjang).
const COV = (alias) =>
  `COALESCE(${alias}.tk_pd,0)+COALESCE(${alias}.kb_pd,0)+COALESCE(${alias}.tpa_pd,0)+COALESCE(${alias}.sps_pd,0)+COALESCE(${alias}.sd_pd,0)+COALESCE(${alias}.smp_pd,0)+COALESCE(${alias}.sma_pd,0)+COALESCE(${alias}.smk_pd,0)`

// Kapasitas porsi/hari dari jumlah SPPG.
const KAPASITAS = (sppgExpr) => `(${sppgExpr} * ${PORSI_PER_SPPG_PER_HARI})`

// Persentase coverage = kapasitas / penerima * 100. NULL kalau penerima 0/NULL.
const COVERAGE_PCT = (sppgExpr, covExpr) =>
  `CASE WHEN ${covExpr} IS NULL OR ${covExpr} = 0 THEN NULL
     ELSE (${KAPASITAS(sppgExpr)}::numeric / (${covExpr})::numeric) * 100 END`

// Deduplicate views + exclude garbage BPS codes (appear in multiple provinces)
const CLEAN_BPS = `SELECT kode_kecamatan_bps FROM v_sppg_per_kecamatan
GROUP BY kode_kecamatan_bps
HAVING count(DISTINCT provinsi) = 1 AND kode_kecamatan_bps IS NOT NULL AND kode_kecamatan_bps != ''`

const V = `SELECT v.kode_kecamatan_bps, min(v.provinsi) as provinsi, min(v.kabkota) as kabkota, sum(v.jumlah_sppg) as jumlah_sppg
FROM v_sppg_per_kecamatan v
JOIN (${CLEAN_BPS}) c ON v.kode_kecamatan_bps = c.kode_kecamatan_bps
GROUP BY v.kode_kecamatan_bps`

const KC = `SELECT DISTINCT ON (kode_kecamatan_bps) kode_kecamatan_bps, lat, lon FROM kecamatan_coords`

const DAPODIK_AGG = `SELECT km.kode_kecamatan_bps,
  SUM(d.total_pd) as total_pd,
  SUM(d.sd_pd) as sd_pd, SUM(d.tk_pd) as tk_pd, SUM(d.kb_pd) as kb_pd,
  SUM(d.tpa_pd) as tpa_pd, SUM(d.sps_pd) as sps_pd,
  SUM(d.smp_pd) as smp_pd, SUM(d.sma_pd) as sma_pd,
  SUM(d.smk_pd) as smk_pd, SUM(d.slb_pd) as slb_pd
FROM kecamatan_mapping km
JOIN dapodik_pd d ON km.kode_wilayah_dapodik = d.kode_wilayah_dapodik
GROUP BY km.kode_kecamatan_bps`

router.get('/stats', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT
        (SELECT count(*) FROM v_sppg) as total_sppg,
        (SELECT count(DISTINCT kode_kecamatan_bps) FROM v_sppg) as total_kecamatan,
        (SELECT count(DISTINCT kabkota) FROM v_sppg) as total_kabkota,
        (SELECT count(DISTINCT provinsi) FROM v_sppg) as total_provinsi,
        (SELECT count(*) FROM (${V}) v WHERE EXISTS (SELECT 1 FROM kecamatan_mapping km WHERE km.kode_kecamatan_bps = v.kode_kecamatan_bps)) as total_kecamatan_pd,
        (SELECT COALESCE(SUM(${COV('d')}),0) FROM (${DAPODIK_AGG}) d) as total_penerima
    `)
    res.json(r.rows[0])
  } catch (err) {
    console.error('GET /stats error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/sppg', async (req, res) => {
  try {
    const { q, provinsi, kabkota, page = 1, limit = 50 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)
    let where = `WHERE 1=1`
    const params = []
    let idx = 1

    if (q) {
      where += ` AND (sppg.nama_sppg ILIKE $${idx} OR sppg.desa ILIKE $${idx} OR sppg.kecamatan ILIKE $${idx} OR sppg.kabkota ILIKE $${idx})`
      params.push(`%${q}%`); idx++
    }
    if (provinsi) { where += ` AND sppg.provinsi = $${idx}`; params.push(provinsi); idx++ }
    if (kabkota) { where += ` AND sppg.kabkota = $${idx}`; params.push(kabkota); idx++ }

    const countResult = await db.query(`SELECT count(*) FROM v_sppg sppg ${where}`, params)
    const total = parseInt(countResult.rows[0].count)

    params.push(parseInt(limit), offset)
    const dataResult = await db.query(`
      SELECT sppg.id, sppg.nama_sppg, sppg.desa, sppg.kecamatan,
             sppg.kabkota, sppg.provinsi, sppg.kode_kecamatan_bps,
             kc.lat, kc.lon
      FROM v_sppg sppg
      LEFT JOIN (${KC}) kc ON sppg.kode_kecamatan_bps = kc.kode_kecamatan_bps
      ${where}
      ORDER BY sppg.provinsi, sppg.kabkota, sppg.kecamatan, sppg.nama_sppg
      LIMIT $${idx} OFFSET $${idx + 1}
    `, params)

    res.json({ data: dataResult.rows, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) })
  } catch (err) {
    console.error('GET /sppg error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/kecamatan', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT
        v.kode_kecamatan_bps,
        (SELECT kecamatan FROM v_sppg WHERE kode_kecamatan_bps = v.kode_kecamatan_bps LIMIT 1) as kecamatan,
        v.kabkota, v.provinsi, v.jumlah_sppg,
        ${KAPASITAS('v.jumlah_sppg')} as kapasitas_porsi_per_hari,
        COALESCE(${COV('d')}, 0) as penerima_pd,
        kc.lat, kc.lon,
        CASE WHEN ${COV('d')} IS NULL OR ${COV('d')} = 0 THEN NULL
          WHEN ${COVERAGE_PCT('v.jumlah_sppg', COV('d'))} < ${TIER_MERAH_MAX} THEN 'merah'
          WHEN ${COVERAGE_PCT('v.jumlah_sppg', COV('d'))} < ${TIER_KUNING_MAX} THEN 'kuning'
          WHEN ${COVERAGE_PCT('v.jumlah_sppg', COV('d'))} <= ${TIER_HIJAU_MAX} THEN 'hijau_muda'
          ELSE 'hijau_tua' END as tier,
        ROUND(${COVERAGE_PCT('v.jumlah_sppg', COV('d'))}, 1) as coverage_persen
      FROM (${V}) v
      LEFT JOIN (${DAPODIK_AGG}) d ON v.kode_kecamatan_bps = d.kode_kecamatan_bps
      LEFT JOIN (${KC}) kc ON v.kode_kecamatan_bps = kc.kode_kecamatan_bps
      ORDER BY v.provinsi, v.kabkota, v.kode_kecamatan_bps
    `)
    res.json(r.rows)
  } catch (err) {
    console.error('GET /kecamatan error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/coverage', async (req, res) => {
  try {
    const r = await db.query(`
      WITH cov AS (
        SELECT v.jumlah_sppg, ${COV('d')} as penerima_pd,
          ${COVERAGE_PCT('v.jumlah_sppg', COV('d'))} as pct
        FROM (${V}) v
        LEFT JOIN (${DAPODIK_AGG}) d ON v.kode_kecamatan_bps = d.kode_kecamatan_bps
      )
      SELECT count(*) as total_kecamatan,
        count(*) FILTER (WHERE pct IS NULL) as no_data,
        count(*) FILTER (WHERE pct < ${TIER_MERAH_MAX} AND pct IS NOT NULL) as merah,
        count(*) FILTER (WHERE pct >= ${TIER_MERAH_MAX} AND pct < ${TIER_KUNING_MAX}) as kuning,
        count(*) FILTER (WHERE pct >= ${TIER_KUNING_MAX} AND pct <= ${TIER_HIJAU_MAX}) as hijau_muda,
        count(*) FILTER (WHERE pct > ${TIER_HIJAU_MAX}) as hijau_tua,
        ROUND(COALESCE(AVG(pct), 0), 1) as rata_rata_coverage
      FROM cov
    `)
    res.json(r.rows[0])
  } catch (err) {
    console.error('GET /coverage error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/coverage/provinsi', async (req, res) => {
  try {
    const r = await db.query(`
      WITH cov AS (
        SELECT v.provinsi, ${COV('d')} as penerima_pd,
          ${COVERAGE_PCT('v.jumlah_sppg', COV('d'))} as pct
        FROM (${V}) v
        LEFT JOIN (${DAPODIK_AGG}) d ON v.kode_kecamatan_bps = d.kode_kecamatan_bps
      )
      SELECT provinsi, count(*) as total_kecamatan,
        count(*) FILTER (WHERE pct IS NOT NULL) as terdata,
        count(*) FILTER (WHERE pct < ${TIER_MERAH_MAX} AND pct IS NOT NULL) as merah,
        count(*) FILTER (WHERE pct >= ${TIER_MERAH_MAX} AND pct < ${TIER_KUNING_MAX}) as kuning,
        count(*) FILTER (WHERE pct >= ${TIER_KUNING_MAX} AND pct <= ${TIER_HIJAU_MAX}) as hijau_muda,
        count(*) FILTER (WHERE pct > ${TIER_HIJAU_MAX}) as hijau_tua,
        ROUND(COALESCE(AVG(pct), 0), 1) as rata_rata_coverage
      FROM cov GROUP BY provinsi ORDER BY provinsi
    `)
    res.json(r.rows)
  } catch (err) {
    console.error('GET /coverage/provinsi error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/coverage/kabkota', async (req, res) => {
  try {
    const r = await db.query(`
      WITH cov AS (
        SELECT v.provinsi, v.kabkota, ${COV('d')} as penerima_pd,
          ${COVERAGE_PCT('v.jumlah_sppg', COV('d'))} as pct
        FROM (${V}) v
        LEFT JOIN (${DAPODIK_AGG}) d ON v.kode_kecamatan_bps = d.kode_kecamatan_bps
      )
      SELECT provinsi, kabkota, count(*) as total_kecamatan,
        count(*) FILTER (WHERE pct IS NOT NULL) as terdata,
        count(*) FILTER (WHERE pct < ${TIER_MERAH_MAX} AND pct IS NOT NULL) as merah,
        count(*) FILTER (WHERE pct >= ${TIER_MERAH_MAX} AND pct < ${TIER_KUNING_MAX}) as kuning,
        count(*) FILTER (WHERE pct >= ${TIER_KUNING_MAX} AND pct <= ${TIER_HIJAU_MAX}) as hijau_muda,
        count(*) FILTER (WHERE pct > ${TIER_HIJAU_MAX}) as hijau_tua,
        ROUND(COALESCE(AVG(pct), 0), 1) as rata_rata_coverage
      FROM cov GROUP BY provinsi, kabkota ORDER BY provinsi, kabkota
    `)
    res.json(r.rows)
  } catch (err) {
    console.error('GET /coverage/kabkota error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/peserta-didik', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT
        d.kode_wilayah_dapodik as kode_kecamatan,
        d.kecamatan, d.kabkota, d.provinsi,
        d.total_pd as jumlah_peserta_didik,
        d.sd_pd, d.smp_pd, d.sma_pd, d.smk_pd, d.slb_pd,
        d.tk_pd, d.kb_pd, d.tpa_pd, d.sps_pd,
        (${COV('d')}) as penerima_pd,
        COALESCE(s.jumlah_sppg, 0) as jumlah_sppg,
        kc.lat, kc.lon
      FROM dapodik_pd d
      LEFT JOIN (
        SELECT km.kode_wilayah_dapodik, sum(v.jumlah_sppg) as jumlah_sppg
        FROM kecamatan_mapping km
        JOIN (${V}) v ON km.kode_kecamatan_bps = v.kode_kecamatan_bps
        GROUP BY km.kode_wilayah_dapodik
      ) s ON d.kode_wilayah_dapodik = s.kode_wilayah_dapodik
      LEFT JOIN (
        SELECT DISTINCT ON (km.kode_wilayah_dapodik) km.kode_wilayah_dapodik, kc.lat, kc.lon
        FROM kecamatan_mapping km
        JOIN (${KC}) kc ON km.kode_kecamatan_bps = kc.kode_kecamatan_bps
      ) kc ON d.kode_wilayah_dapodik = kc.kode_wilayah_dapodik
      ORDER BY d.provinsi, d.kabkota, d.kecamatan
    `)
    res.json(r.rows)
  } catch (err) {
    console.error('GET /peserta-didik error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/coverage/detail/:kode', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT sppg.id, sppg.nama_sppg, sppg.desa, sppg.kecamatan, sppg.kabkota, sppg.provinsi, kc.lat, kc.lon
      FROM v_sppg sppg
      LEFT JOIN (${KC}) kc ON sppg.kode_kecamatan_bps = kc.kode_kecamatan_bps
      WHERE sppg.kode_kecamatan_bps = $1
    `, [req.params.kode])
    res.json(r.rows)
  } catch (err) {
    console.error('GET /coverage/detail/:kode error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/distribusi', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT provinsi, count(*) as total_sppg,
        count(DISTINCT kode_kecamatan_bps) as total_kecamatan,
        count(DISTINCT kabkota) as total_kabkota
      FROM v_sppg
      GROUP BY provinsi ORDER BY total_sppg DESC
    `)
    res.json(r.rows)
  } catch (err) {
    console.error('GET /distribusi error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/stunting', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT provinsi, prevalensi, kategori, tahun
      FROM stunting_provinsi
      ORDER BY provinsi
    `)
    res.json(r.rows)
  } catch (err) {
    console.error('GET /stunting error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/filter-options', async (req, res) => {
  try {
    const prov = await db.query(`SELECT DISTINCT provinsi FROM v_sppg ORDER BY provinsi`)
    const kab = await db.query(`SELECT DISTINCT kabkota, provinsi FROM v_sppg ORDER BY kabkota`)
    res.json({
      provinsi: prov.rows.map(r => r.provinsi),
      kabkota: kab.rows.map(r => ({ kabkota: r.kabkota, provinsi: r.provinsi })),
    })
  } catch (err) {
    console.error('GET /filter-options error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
