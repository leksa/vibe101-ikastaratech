// Business rule: coverage SPPG vs penerima (PAUD + SD) per kecamatan.
//
// Ini sumber-kebenaran (single source of truth) untuk logika coverage.
// Query SQL di api/routes.js MENIRU rumus yang sama — kalau salah satu
// berubah, ubah keduanya (lihat unit test di tests/coverage.test.js).

// Porsi makanan yang bisa dilayani satu SPPG per hari (asumsi program MBG).
export const PORSI_PER_SPPG_PER_HARI = 2000

// Batas tier coverage (persen).
export const TIER_MERAH_MAX = 70 // < 70%  -> merah (kurang)
export const TIER_KUNING_MAX = 90 // 70-90% -> kuning (cukup), >= 90 -> hijau

/** Kapasitas porsi/hari dari jumlah SPPG. */
export function kapasitas(jumlahSppg) {
  return jumlahSppg * PORSI_PER_SPPG_PER_HARI
}

/**
 * Persentase coverage = kapasitas / penerima * 100.
 * Mengembalikan null kalau jumlah penerima tidak valid (0 / null / undefined).
 */
export function coveragePct(jumlahSppg, jumlahPenerima) {
  if (!jumlahPenerima || jumlahPenerima <= 0) return null
  return (kapasitas(jumlahSppg) / jumlahPenerima) * 100
}

/**
 * Tier warna dari persentase coverage.
 * null penerima -> null (tidak ada data).
 */
export function tier(jumlahSppg, jumlahPenerima) {
  const pct = coveragePct(jumlahSppg, jumlahPenerima)
  if (pct === null) return null
  if (pct < TIER_MERAH_MAX) return 'merah'
  if (pct < TIER_KUNING_MAX) return 'kuning'
  return 'hijau'
}
