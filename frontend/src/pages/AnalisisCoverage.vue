<template>
  <div>
    <h2 class="page-title">Analisis Coverage SPPG vs Peserta Didik</h2>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
      <div class="stat-card">
        <p class="text-sm text-slate-500">Rata-rata Coverage</p>
        <p class="text-2xl font-bold" :class="coverageAvgColor">{{ coverageSummary.rata_rata_coverage || 0 }}%</p>
      </div>
      <div class="stat-card border-l-4 border-green-700">
        <p class="text-sm text-slate-500">Hijau tua (&gt;100%)</p>
        <p class="text-2xl font-bold text-green-700">{{ coverageSummary.hijau_tua || 0 }}</p>
        <p class="text-xs text-slate-400">kecamatan</p>
      </div>
      <div class="stat-card border-l-4 border-green-500">
        <p class="text-sm text-slate-500">Hijau muda (90-100%)</p>
        <p class="text-2xl font-bold text-green-600">{{ coverageSummary.hijau_muda || 0 }}</p>
        <p class="text-xs text-slate-400">kecamatan</p>
      </div>
      <div class="stat-card border-l-4 border-yellow-500">
        <p class="text-sm text-slate-500">Kuning (70-89%)</p>
        <p class="text-2xl font-bold text-yellow-600">{{ coverageSummary.kuning || 0 }}</p>
        <p class="text-xs text-slate-400">kecamatan</p>
      </div>
      <div class="stat-card border-l-4 border-red-500">
        <p class="text-sm text-slate-500">Merah (&lt;70%)</p>
        <p class="text-2xl font-bold text-red-600">{{ coverageSummary.merah || 0 }}</p>
        <p class="text-xs text-slate-400">kecamatan</p>
      </div>
    </div>

    <!-- Tab Selector -->
    <div class="flex gap-2 mb-4">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
        :class="activeTab === tab.key
          ? 'bg-sky-500 text-white shadow-sm'
          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Table: Per Provinsi -->
    <div v-if="activeTab === 'provinsi'" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="table-header">Provinsi</th>
              <th class="table-header text-right">Total Kec</th>
              <th class="table-header text-right">Terdata</th>
              <th class="table-header text-right">H. tua</th>
              <th class="table-header text-right">H. muda</th>
              <th class="table-header text-right">Kuning</th>
              <th class="table-header text-right">Merah</th>
              <th class="table-header text-right">Rata-rata</th>
              <th class="table-header" style="min-width:150px">Distribusi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in provinsiData" :key="row.provinsi" class="hover:bg-slate-50/50 transition-colors">
              <td class="table-cell font-medium">{{ row.provinsi }}</td>
              <td class="table-cell text-right">{{ row.total_kecamatan }}</td>
              <td class="table-cell text-right">{{ row.terdata }}</td>
              <td class="table-cell text-right">
                <span v-if="row.hijau_tua > 0" class="text-green-700 font-medium">{{ row.hijau_tua }}</span>
                <span v-else class="text-slate-300">0</span>
              </td>
              <td class="table-cell text-right">
                <span v-if="row.hijau_muda > 0" class="text-green-600 font-medium">{{ row.hijau_muda }}</span>
                <span v-else class="text-slate-300">0</span>
              </td>
              <td class="table-cell text-right">
                <span v-if="row.kuning > 0" class="text-yellow-600 font-medium">{{ row.kuning }}</span>
                <span v-else class="text-slate-300">0</span>
              </td>
              <td class="table-cell text-right">
                <span v-if="row.merah > 0" class="text-red-600 font-medium">{{ row.merah }}</span>
                <span v-else class="text-slate-300">0</span>
              </td>
              <td class="table-cell text-right font-medium" :class="tierTextClass(row.rata_rata_coverage)">
                {{ row.rata_rata_coverage }}%
              </td>
              <td class="table-cell">
                <div class="h-2 rounded-full bg-slate-100 flex overflow-hidden min-w-[100px]">
                  <div v-if="row.merah > 0" class="h-full bg-red-500" :style="{ width: (row.merah/row.terdata)*100 + '%' }" />
                  <div v-if="row.kuning > 0" class="h-full bg-yellow-500" :style="{ width: (row.kuning/row.terdata)*100 + '%' }" />
                  <div v-if="row.hijau_muda > 0" class="h-full bg-green-500" :style="{ width: (row.hijau_muda/row.terdata)*100 + '%' }" />
                  <div v-if="row.hijau_tua > 0" class="h-full bg-green-700" :style="{ width: (row.hijau_tua/row.terdata)*100 + '%' }" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Table: Per Kabupaten/Kota -->
    <div v-if="activeTab === 'kabkota'" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th class="table-header">Provinsi</th>
              <th class="table-header">Kabupaten/Kota</th>
              <th class="table-header text-right">Total Kec</th>
              <th class="table-header text-right">Terdata</th>
              <th class="table-header text-right">H. tua</th>
              <th class="table-header text-right">H. muda</th>
              <th class="table-header text-right">Kuning</th>
              <th class="table-header text-right">Merah</th>
              <th class="table-header text-right">Rata-rata</th>
              <th class="table-header" style="min-width:120px">Bar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="(row, i) in kabkotaData" :key="i" class="hover:bg-slate-50/50 transition-colors text-sm">
              <td class="table-cell text-xs text-slate-500">{{ row.provinsi }}</td>
              <td class="table-cell font-medium">{{ row.kabkota }}</td>
              <td class="table-cell text-right">{{ row.total_kecamatan }}</td>
              <td class="table-cell text-right">{{ row.terdata }}</td>
              <td class="table-cell text-right">
                <span v-if="row.hijau_tua > 0" class="text-green-700 font-medium">{{ row.hijau_tua }}</span>
                <span v-else class="text-slate-300">0</span>
              </td>
              <td class="table-cell text-right">
                <span v-if="row.hijau_muda > 0" class="text-green-600 font-medium">{{ row.hijau_muda }}</span>
                <span v-else class="text-slate-300">0</span>
              </td>
              <td class="table-cell text-right">
                <span v-if="row.kuning > 0" class="text-yellow-600 font-medium">{{ row.kuning }}</span>
                <span v-else class="text-slate-300">0</span>
              </td>
              <td class="table-cell text-right">
                <span v-if="row.merah > 0" class="text-red-600 font-medium">{{ row.merah }}</span>
                <span v-else class="text-slate-300">0</span>
              </td>
              <td class="table-cell text-right font-medium" :class="tierTextClass(row.rata_rata_coverage)">
                {{ row.rata_rata_coverage }}%
              </td>
              <td class="table-cell">
                <div class="h-2 rounded-full bg-slate-100 flex overflow-hidden min-w-[80px]">
                  <div v-if="row.merah > 0" class="h-full bg-red-500" :style="{ width: (row.merah/row.terdata)*100 + '%' }" />
                  <div v-if="row.kuning > 0" class="h-full bg-yellow-500" :style="{ width: (row.kuning/row.terdata)*100 + '%' }" />
                  <div v-if="row.hijau_muda > 0" class="h-full bg-green-500" :style="{ width: (row.hijau_muda/row.terdata)*100 + '%' }" />
                  <div v-if="row.hijau_tua > 0" class="h-full bg-green-700" :style="{ width: (row.hijau_tua/row.terdata)*100 + '%' }" />
                </div>
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
const provinsiData = ref([])
const kabkotaData = ref([])
const coverageSummary = ref({})
const activeTab = ref('provinsi')

const tabs = [
  { key: 'provinsi', label: 'Per Provinsi' },
  { key: 'kabkota', label: 'Per Kabupaten/Kota' },
]

const coverageAvgColor = computed(() => tierTextClass(coverageSummary.value.rata_rata_coverage || 0))

function tierTextClass(v) {
  if (v > 100) return 'text-green-700'
  if (v >= 90) return 'text-green-600'
  if (v >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

onMounted(async () => {
  const [cov, prov, kab] = await Promise.all([
    fetch(`${API}/coverage`).then(r => r.json()),
    fetch(`${API}/coverage/provinsi`).then(r => r.json()),
    fetch(`${API}/coverage/kabkota`).then(r => r.json()),
  ])
  coverageSummary.value = cov
  provinsiData.value = prov
  kabkotaData.value = kab
})
</script>
