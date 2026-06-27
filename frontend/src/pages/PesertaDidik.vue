<template>
  <div>
    <h2 class="page-title">Data Peserta Didik (Sasaran KB–TK–SD)</h2>

    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
      <div class="stat-card">
        <p class="text-sm text-slate-500">Kecamatan Terdata</p>
        <p class="text-2xl font-bold text-slate-800">{{ kecamatanCount.toLocaleString('id-ID') }}</p>
      </div>
      <div class="stat-card border-l-4 border-sky-400">
        <p class="text-sm text-slate-500">Penerima sasaran</p>
        <p class="text-2xl font-bold text-sky-600">{{ paudSdTotal.toLocaleString('id-ID') }}</p>
        <p class="text-xs text-slate-400">KB–TK–SD (sederajat)</p>
      </div>
      <div class="stat-card">
        <p class="text-sm text-slate-500">Total PD (semua jenjang)</p>
        <p class="text-2xl font-bold text-slate-800">{{ totalPd.toLocaleString('id-ID') }}</p>
      </div>
      <div class="stat-card">
        <p class="text-sm text-slate-500">Rata-rata penerima/kec</p>
        <p class="text-2xl font-bold text-slate-800">{{ avgPaudSd.toLocaleString('id-ID') }}</p>
      </div>
    </div>

    <div class="stat-card mb-6">
      <h3 class="font-semibold text-slate-700 mb-4">Sebaran Jenjang Pendidikan</h3>
      <div v-if="loading" class="text-sm text-slate-400">Loading...</div>
      <div v-else>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4">
          <div v-for="item in jenjangData" :key="item.label" class="p-3 bg-slate-50 rounded-lg">
            <p class="text-xs text-slate-500">{{ item.label }}</p>
            <p class="text-lg font-bold text-slate-800">{{ item.total.toLocaleString('id-ID') }}</p>
            <p class="text-xs text-slate-400">{{ item.persen }}%</p>
          </div>
        </div>
        <div class="text-xs text-slate-500 bg-amber-50 p-3 rounded-lg">
          <strong>Fokus Coverage:</strong> KB–TK–SD sederajat — PAUD (TK+KB+TPA+SPS) + SD — <strong>{{ paudSdTotal.toLocaleString('id-ID') }}</strong> siswa sasaran
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th class="table-header">Kecamatan</th>
              <th class="table-header">Kab/Kota</th>
              <th class="table-header text-right w-20">Penerima</th>
              <th class="table-header text-right">SD</th>
              <th class="table-header text-right">TK</th>
              <th class="table-header text-right">KB</th>
              <th class="table-header text-right">TPA</th>
              <th class="table-header text-right">SPS</th>
              <th class="table-header text-right">Total</th>
              <th class="table-header text-right">SPPG</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in allData" :key="row.kode_kecamatan" class="hover:bg-slate-50/50 transition-colors">
              <td class="table-cell font-medium">{{ cleanKec(row.kecamatan) }}</td>
              <td class="table-cell text-xs">{{ cleanKab(row.kabkota) }}</td>
              <td class="table-cell text-right font-semibold text-sky-700">{{ formatNum(row.penerima_pd) }}</td>
              <td class="table-cell text-right">{{ formatNum(row.sd_pd) }}</td>
              <td class="table-cell text-right">{{ formatNum(row.tk_pd) }}</td>
              <td class="table-cell text-right">{{ formatNum(row.kb_pd) }}</td>
              <td class="table-cell text-right">{{ formatNum(row.tpa_pd) }}</td>
              <td class="table-cell text-right">{{ formatNum(row.sps_pd) }}</td>
              <td class="table-cell text-right text-slate-400">{{ formatNum(row.jumlah_peserta_didik) }}</td>
              <td class="table-cell text-right">
                <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="row.jumlah_sppg > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'"
                >{{ row.jumlah_sppg }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const API = '/api'
const allData = ref([])
const loading = ref(true)

const kecamatanCount = computed(() => allData.value.length)
const totalPd = computed(() => allData.value.reduce((s, r) => s + (r.jumlah_peserta_didik || 0), 0))
const paudSdTotal = computed(() => allData.value.reduce((s, r) => s + (r.penerima_pd || 0), 0))
const avgPaudSd = computed(() => kecamatanCount.value > 0 ? Math.round(paudSdTotal.value / kecamatanCount.value) : 0)

const jenjangData = computed(() => {
  const sum = (key) => allData.value.reduce((s, r) => s + (r[key] || 0), 0)
  const totals = {
    'SD': sum('sd_pd'),
    'TK': sum('tk_pd'),
    'KB': sum('kb_pd'),
    'TPA': sum('tpa_pd'),
    'SPS': sum('sps_pd'),
    'SMP': sum('smp_pd'),
    'SMA': sum('sma_pd'),
    'SMK': sum('smk_pd'),
    'SLB': sum('slb_pd'),
  }
  return Object.entries(totals).map(([label, total]) => ({
    label,
    total,
    persen: totalPd.value > 0 ? ((total / totalPd.value) * 100).toFixed(1) : 0,
  })).filter(d => d.total > 0)
})

function cleanKec(v) { return (v || '').replace('Kec. ', '') }
function cleanKab(v) { return (v || '').replace('Kab. ', '').replace('Kota ', '') }
function formatNum(n) { return n ? Number(n).toLocaleString('id-ID') : '0' }

onMounted(async () => {
  allData.value = await fetch(`${API}/peserta-didik`).then(r => r.json())
  loading.value = false
})
</script>
