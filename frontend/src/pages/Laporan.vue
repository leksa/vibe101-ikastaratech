<template>
  <div>
    <h2 class="page-title">Laporan</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Export Card -->
      <div class="stat-card">
        <h3 class="font-semibold text-slate-700 mb-3">Ekspor Data</h3>
        <p class="text-sm text-slate-500 mb-4">Download data dalam format CSV untuk analisis lebih lanjut.</p>
        <div class="space-y-2">
          <button
            @click="exportCSV('kecamatan')"
            class="w-full text-left px-4 py-3 bg-slate-50 rounded-lg hover:bg-sky-50 transition-colors border border-slate-200"
          >
            <p class="text-sm font-medium text-slate-700">Data Coverage per Kecamatan</p>
            <p class="text-xs text-slate-400">Kapasitas SPPG, total PD, dan coverage (%)</p>
          </button>
          <button
            @click="exportCSV('sppg')"
            class="w-full text-left px-4 py-3 bg-slate-50 rounded-lg hover:bg-sky-50 transition-colors border border-slate-200"
          >
            <p class="text-sm font-medium text-slate-700">Data SPPG Lengkap</p>
            <p class="text-xs text-slate-400">Semua SPPG dengan detail lokasi</p>
          </button>
          <button
            @click="exportCSV('peserta_didik')"
            class="w-full text-left px-4 py-3 bg-slate-50 rounded-lg hover:bg-sky-50 transition-colors border border-slate-200"
          >
            <p class="text-sm font-medium text-slate-700">Data Peserta Didik</p>
            <p class="text-xs text-slate-400">Peserta didik per kecamatan per jenjang</p>
          </button>
        </div>
      </div>

      <div class="stat-card">
        <h3 class="font-semibold text-slate-700 mb-3">Rangkuman Coverage</h3>
        <div v-if="loading" class="text-sm text-slate-400">Loading...</div>
        <div v-else class="space-y-4">
          <div class="flex items-center justify-between py-2 border-b border-slate-100">
            <span class="text-sm text-slate-600">Total provinsi dengan SPPG</span>
            <span class="font-semibold">{{ summary.total_provinsi }}</span>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-slate-100">
            <span class="text-sm text-slate-600">Total kabupaten/kota dengan SPPG</span>
            <span class="font-semibold">{{ summary.total_kabkota }}</span>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-slate-100">
            <span class="text-sm text-slate-600">Total kecamatan dengan SPPG</span>
            <span class="font-semibold">{{ summary.total_kecamatan }}</span>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-slate-100">
            <span class="text-sm text-slate-600">Total SPPG</span>
            <span class="font-semibold">{{ summary.total_sppg }}</span>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-slate-100">
            <span class="text-sm text-slate-600">Kecamatan dengan data PD</span>
            <span class="font-semibold">{{ summary.total_kecamatan_pd }}</span>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-slate-100">
            <span class="text-sm text-slate-600">Total penerima (sasaran)</span>
            <span class="font-semibold text-sky-700">{{ formatNum(summary.total_penerima) }}</span>
          </div>
          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-slate-600">Rata-rata coverage</span>
            <span
              class="font-semibold"
              :class="coverageAvgColor"
            >{{ coverageSummary.rata_rata_coverage || 0 }}%</span>
          </div>
        </div>
      </div>

      <!-- Note -->
      <div class="md:col-span-2 stat-card bg-sky-50 border-sky-200">
        <p class="text-sm text-sky-800">
          <strong>Catatan:</strong> Data peserta didik bersumber dari DAPODIK.
          Coverage dihitung sebagai perbandingan antara kapasitas SPPG (2.000 porsi/hari per SPPG)
          dengan <strong>penerima sasaran</strong> KB–TK–SD–SMP–SMA sederajat
          (TK+KB+TPA+SPS+SD+SMP+SMA+SMK) per kecamatan.
          Data bersifat sementara dan akan diperbarui secara berkala.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const API = '/api'
const summary = ref({})
const coverageSummary = ref({})
const loading = ref(true)

const coverageAvgColor = computed(() => {
  const v = coverageSummary.value.rata_rata_coverage || 0
  if (v >= 90) return 'text-green-600'
  if (v >= 70) return 'text-yellow-600'
  return 'text-red-600'
})

function formatNum(n) {
  if (!n) return '0'
  return Number(n).toLocaleString('id-ID')
}

async function exportCSV(type) {
  try {
    let data, filename, headers, mapRow

    if (type === 'kecamatan') {
      data = await fetch(`${API}/kecamatan`).then(r => r.json())
      filename = 'coverage-per-kecamatan.csv'
      headers = ['Kode BPS', 'Kecamatan', 'Kabupaten/Kota', 'Provinsi', 'Jumlah SPPG', 'Kapasitas/Hari', 'Penerima', 'Coverage (%)', 'Tier']
      mapRow = (d) => [d.kode_kecamatan_bps, d.kecamatan, d.kabkota, d.provinsi, d.jumlah_sppg, d.kapasitas_porsi_per_hari, d.penerima_pd, d.coverage_persen ?? '', d.tier ?? '']
    } else if (type === 'sppg') {
      const res = await fetch(`${API}/sppg?limit=50000`).then(r => r.json())
      data = res.data
      filename = 'data-sppg-lengkap.csv'
      headers = ['ID', 'Nama SPPG', 'Desa', 'Kecamatan', 'Kabupaten/Kota', 'Provinsi', 'Kode BPS']
      mapRow = (d) => [d.id, d.nama_sppg, d.desa, d.kecamatan, d.kabkota, d.provinsi, d.kode_kecamatan_bps]
    } else {
      data = await fetch(`${API}/peserta-didik`).then(r => r.json())
      filename = 'peserta-didik-per-kecamatan.csv'
      headers = ['Kode Wilayah', 'Kecamatan', 'Kabupaten/Kota', 'Provinsi', 'Penerima', 'SD', 'TK', 'KB', 'TPA', 'SPS', 'SMP', 'SMA']
      mapRow = (d) => [d.kode_kecamatan, d.kecamatan, d.kabkota, d.provinsi, d.penerima_pd, d.sd_pd, d.tk_pd, d.kb_pd, d.tpa_pd, d.sps_pd, d.smp_pd, d.sma_pd]
    }

    const csvContent = [
      headers.join(','),
      ...data.map(d => mapRow(d).map(v => `"${v ?? ''}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (err) {
    console.error('Export failed:', err)
  }
}

onMounted(async () => {
  const [s, c] = await Promise.all([
    fetch(`${API}/stats`).then(r => r.json()),
    fetch(`${API}/coverage`).then(r => r.json()),
  ])
  summary.value = s
  coverageSummary.value = c
  loading.value = false
})
</script>
