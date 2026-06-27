// Business rule: coverage SPPG vs penerima (PAUD + SD) per kecamatan.
//
// Ini sumber-kebenaran (single source of truth) untuk logika coverage.
// Query SQL di api/routes.js MENIRU rumus yang sama — kalau salah satu
// berubah, ubah keduanya (lihat unit test di tests/coverage.test.js).

// Porsi makanan yang bisa dilayani satu SPPG per hari (asumsi program MBG).
export const PORSI_PER_SPPG_PER_HARI = 2000

// Batas tier coverage (persen). 4 tingkat:
export const TIER_MERAH_MAX = 70 // < 70%      -> merah      (kurang)
export const TIER_KUNING_MAX = 90 // 70-89%     -> kuning     (cukup)
export const TIER_HIJAU_MAX = 100 // 90-100%    -> hijau_muda (memadai)
//                                  > 100%      -> hijau_tua  (surplus)

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
 * Tier warna dari persentase coverage (4 tingkat).
 * null penerima -> null (tidak ada data).
 *   < 70%     merah
 *   70-89%    kuning
 *   90-100%   hijau_muda
 *   > 100%    hijau_tua
 */
export function tier(jumlahSppg, jumlahPenerima) {
  const pct = coveragePct(jumlahSppg, jumlahPenerima)
  if (pct === null) return null
  if (pct < TIER_MERAH_MAX) return 'merah'
  if (pct < TIER_KUNING_MAX) return 'kuning'
  if (pct <= TIER_HIJAU_MAX) return 'hijau_muda'
  return 'hijau_tua'
}
