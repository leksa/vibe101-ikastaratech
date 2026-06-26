import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PORSI_PER_SPPG_PER_HARI,
  kapasitas,
  coveragePct,
  tier,
} from '../lib/coverage.js'

test('kapasitas = jumlah SPPG * porsi per SPPG', () => {
  assert.equal(kapasitas(0), 0)
  assert.equal(kapasitas(1), PORSI_PER_SPPG_PER_HARI)
  assert.equal(kapasitas(3), 3 * PORSI_PER_SPPG_PER_HARI)
})

test('coveragePct: penerima tidak valid -> null', () => {
  assert.equal(coveragePct(5, 0), null)
  assert.equal(coveragePct(5, null), null)
  assert.equal(coveragePct(5, undefined), null)
  assert.equal(coveragePct(5, -10), null)
})

test('coveragePct: rumus benar', () => {
  // 1 SPPG = 2000 porsi, penerima 1000 -> 200%
  assert.equal(coveragePct(1, 1000), 200)
  // 1 SPPG = 2000 porsi, penerima 2000 -> 100%
  assert.equal(coveragePct(1, 2000), 100)
  // 1 SPPG = 2000 porsi, penerima 4000 -> 50%
  assert.equal(coveragePct(1, 4000), 50)
})

test('tier: batas merah/kuning/hijau (70 / 90)', () => {
  // penerima 2000 -> pct = jumlahSppg * 100
  assert.equal(tier(0, 2000), 'merah') // 0%
  assert.equal(tier(1, 4000), 'merah') // 50%
  assert.equal(tier(1, 3000), 'merah') // 66.7%
  assert.equal(tier(1, 2500), 'kuning') // 80%
  assert.equal(tier(1, 2000), 'hijau') // 100%
})

test('tier: tepat di batas', () => {
  // penerima 20000, kapasitas = jumlahSppg * 2000 -> pct = jumlahSppg * 10
  assert.equal(tier(6.999, 20000), 'merah') // 69.99%
  assert.equal(tier(7, 20000), 'kuning') // 70.00%
  assert.equal(tier(8.999, 20000), 'kuning') // 89.99%
  assert.equal(tier(9, 20000), 'hijau') // 90.00%
})

test('tier: tanpa data penerima -> null', () => {
  assert.equal(tier(5, 0), null)
  assert.equal(tier(5, null), null)
})
