<template>
  <div>
    <h2 class="page-title">Data SPPG</h2>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 flex flex-wrap gap-3 items-end">
      <div class="flex-1 min-w-[200px]">
        <label class="block text-xs font-medium text-slate-500 mb-1">Cari</label>
        <input
          v-model="search"
          placeholder="Nama SPPG, desa, kecamatan..."
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400"
          @input="debouncedSearch"
        />
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-500 mb-1">Provinsi</label>
        <select
          v-model="filterProvinsi"
          class="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/40"
          @change="fetchData(1)"
        >
          <option value="">Semua Provinsi</option>
          <option v-for="p in filterOptions.provinsi" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-500 mb-1">Per Halaman</label>
        <select
          v-model="perPage"
          class="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/40"
          @change="fetchData(1)"
        >
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="200">200</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-sm text-slate-400">Memuat data...</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="table-header">#</th>
              <th class="table-header">Nama SPPG</th>
              <th class="table-header">Desa</th>
              <th class="table-header">Kecamatan</th>
              <th class="table-header">Kabupaten/Kota</th>
              <th class="table-header">Provinsi</th>
              <th class="table-header">Kode BPS</th>
              <th class="table-header">Koordinat</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="(row, i) in rows" :key="row.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="table-cell text-slate-400 font-mono text-xs">{{ offset + i + 1 }}</td>
              <td class="table-cell font-medium text-slate-800">{{ row.nama_sppg }}</td>
              <td class="table-cell">{{ row.desa }}</td>
              <td class="table-cell">{{ row.kecamatan }}</td>
              <td class="table-cell">{{ row.kabkota }}</td>
              <td class="table-cell">{{ row.provinsi }}</td>
              <td class="table-cell font-mono text-xs text-slate-500">{{ row.kode_kecamatan_bps }}</td>
              <td class="table-cell text-xs">
                <span v-if="row.lat" class="text-sky-600">{{ row.lat.toFixed(4) }}, {{ row.lon.toFixed(4) }}</span>
                <span v-else class="text-slate-300">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between mt-4 text-sm">
      <span class="text-slate-500">
        Menampilkan {{ offset + 1 }}–{{ Math.min(offset + perPage, total) }} dari {{ total.toLocaleString('id-ID') }}
      </span>
      <div class="flex gap-1">
        <button
          @click="fetchData(page - 1)"
          :disabled="page <= 1"
          class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← Prev
        </button>
        <span class="px-3 py-1.5 text-slate-500">
          {{ page }} / {{ totalPages }}
        </span>
        <button
          @click="fetchData(page + 1)"
          :disabled="page >= totalPages"
          class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const API = '/api'
const rows = ref([])
const total = ref(0)
const page = ref(1)
const perPage = ref(50)
const totalPages = ref(0)
const loading = ref(true)
const search = ref('')
const filterProvinsi = ref('')
const filterOptions = ref({ provinsi: [] })

let debounceTimer = null

const offset = ref(0)

function debouncedSearch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchData(1), 300)
}

async function fetchData(p = 1) {
  page.value = p
  offset.value = (p - 1) * perPage.value
  loading.value = true

  const params = new URLSearchParams({ page: p, limit: perPage.value })
  if (search.value) params.set('q', search.value)
  if (filterProvinsi.value) params.set('provinsi', filterProvinsi.value)

  const res = await fetch(`${API}/sppg?${params}`).then(r => r.json())
  rows.value = res.data
  total.value = res.total
  totalPages.value = res.totalPages
  loading.value = false
}

onMounted(async () => {
  filterOptions.value = await fetch(`${API}/filter-options`).then(r => r.json())
  fetchData(1)
})
</script>
