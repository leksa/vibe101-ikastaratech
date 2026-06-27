<template>
  <div class="h-full flex flex-col">
    <h2 class="page-title">Peta Distribusi SPPG</h2>

    <!-- Layer toggle -->
    <div class="flex gap-2 mb-3">
      <button
        v-for="m in modes" :key="m.key" @click="setMode(m.key)"
        class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
        :class="mode === m.key
          ? 'bg-sky-500 text-white shadow-sm'
          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'"
      >{{ m.label }}</button>
    </div>

    <!-- Legend SPPG -->
    <div v-if="mode !== 'stunting'" class="flex items-center gap-4 mb-3 text-xs bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 self-start flex-wrap">
      <span class="text-slate-500 font-medium">Coverage SPPG:</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-700 inline-block" />Hijau tua (&gt;100%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-500 inline-block" />Hijau muda (90-100%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-yellow-500 inline-block" />Kuning (70-89%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-red-500 inline-block" />Merah (&lt;70%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-slate-400 inline-block" />Tanpa data PD</span>
    </div>

    <!-- Legend stunting -->
    <div v-if="mode !== 'sppg'" class="flex items-center gap-4 mb-3 text-xs bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 self-start flex-wrap">
      <span class="text-slate-500 font-medium">Prevalensi stunting 2024:</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm inline-block" style="background:#16a34a" />Rendah (&lt;20%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm inline-block" style="background:#eab308" />Sedang (20-29%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm inline-block" style="background:#f97316" />Tinggi (30-39%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm inline-block" style="background:#dc2626" />Sangat Tinggi (&ge;40%)</span>
      <div class="h-4 w-px bg-slate-200 mx-1" />
      <span class="text-slate-400">Sumber: SSGI/SKI 2024</span>
    </div>

    <!-- Simulasi kapasitas (hanya saat ada titik SPPG) -->
    <div v-if="mode !== 'stunting'" class="mb-3 bg-white px-4 py-3 rounded-lg shadow-sm border border-slate-200">
      <div class="flex items-center gap-4 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-slate-600">Simulasi kapasitas</span>
          <span class="text-xs text-slate-400">1 SPPG =</span>
          <span class="font-bold text-sky-600 tabular-nums w-16 text-right">{{ porsi.toLocaleString('id-ID') }}</span>
          <span class="text-xs text-slate-400">porsi/hari</span>
        </div>
        <input
          type="range" min="250" max="3000" step="50"
          v-model.number="porsi" @input="recolor"
          class="flex-1 min-w-[200px] accent-sky-500 cursor-pointer"
        />
        <button
          @click="porsi = BASE_PORSI; recolor()"
          class="text-xs px-3 py-1 rounded-md border text-slate-500 hover:bg-slate-50"
          :class="porsi !== BASE_PORSI ? 'border-sky-300 text-sky-600' : 'border-slate-200'"
        >Reset ({{ BASE_PORSI.toLocaleString('id-ID') }})</button>
      </div>
      <div class="flex items-center gap-4 mt-2 text-xs tabular-nums flex-wrap">
        <span class="text-slate-400">Hasil:</span>
        <span class="text-green-700 font-medium">▲ {{ sim.hijau_tua }}</span>
        <span class="text-green-600 font-medium">● {{ sim.hijau_muda }}</span>
        <span class="text-yellow-600 font-medium">● {{ sim.kuning }}</span>
        <span class="text-red-600 font-medium">● {{ sim.merah }}</span>
        <span class="text-slate-400">N/A {{ sim.no_data }}</span>
        <div class="h-3 w-px bg-slate-200" />
        <span class="text-slate-500">Rata-rata coverage: <strong :class="avgClass">{{ sim.avg }}%</strong></span>
        <span v-if="porsi !== BASE_PORSI" class="text-sky-600">
          ({{ porsi > BASE_PORSI ? '+' : '' }}{{ Math.round((porsi/BASE_PORSI - 1) * 100) }}% kapasitas)
        </span>
      </div>
    </div>

    <!-- Map -->
    <div ref="mapContainer" class="flex-1 rounded-xl border border-slate-200 shadow-sm min-h-[480px]" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import L from 'leaflet'

const API = '/api'
const BASE_PORSI = 2000

const mapContainer = ref(null)
const locations = ref([])
const porsi = ref(BASE_PORSI)
const mode = ref('sppg')
const modes = [
  { key: 'sppg', label: 'Titik SPPG (coverage)' },
  { key: 'stunting', label: 'Choropleth stunting' },
  { key: 'both', label: 'Keduanya (overlay)' },
]
const sim = reactive({ merah: 0, kuning: 0, hijau_muda: 0, hijau_tua: 0, no_data: 0, avg: 0 })

let map = null
let markersLayer = null
let stuntingLayer = null
const markers = []

const avgClass = computed(() => {
  const v = sim.avg
  if (v > 100) return 'text-green-700'
  if (v >= 90) return 'text-green-600'
  if (v >= 70) return 'text-yellow-600'
  return 'text-red-600'
})

// --- coverage SPPG (skala linear ke porsi) ---
function simPct(loc) {
  if (loc.coverage_persen === null || loc.coverage_persen === undefined) return null
  return Number(loc.coverage_persen) * (porsi.value / BASE_PORSI)
}
function tierFromPct(pct) {
  if (pct === null) return null
  if (pct < 70) return 'merah'
  if (pct < 90) return 'kuning'
  if (pct <= 100) return 'hijau_muda'
  return 'hijau_tua'
}
function tierColor(tier) {
  if (tier === 'hijau_tua') return '#15803d'
  if (tier === 'hijau_muda') return '#22c55e'
  if (tier === 'kuning') return '#eab308'
  if (tier === 'merah') return '#ef4444'
  return '#94a3b8'
}
// --- stunting (makin tinggi makin buruk) ---
function stuntingColor(prevalensi) {
  if (prevalensi == null) return '#cbd5e1'
  if (prevalensi < 20) return '#16a34a'
  if (prevalensi < 30) return '#eab308'
  if (prevalensi < 40) return '#f97316'
  return '#dc2626'
}

function recolor() {
  const c = { merah: 0, kuning: 0, hijau_muda: 0, hijau_tua: 0, no_data: 0 }
  let sumPct = 0, nPct = 0
  for (const { loc, circle } of markers) {
    const pct = simPct(loc)
    const tier = tierFromPct(pct)
    if (tier === null) c.no_data++
    else { c[tier]++; sumPct += pct; nPct++ }
    circle.setStyle({ fillColor: tierColor(tier) })
    circle.setPopupContent(markerPopup(loc, pct))
  }
  sim.merah = c.merah; sim.kuning = c.kuning
  sim.hijau_muda = c.hijau_muda; sim.hijau_tua = c.hijau_tua; sim.no_data = c.no_data
  sim.avg = nPct ? Math.round((sumPct / nPct) * 10) / 10 : 0
}

function markerPopup(loc, pct) {
  const pd = loc.penerima_pd ? `${Number(loc.penerima_pd).toLocaleString('id-ID')} penerima` : 'Tidak ada data PD'
  const cov = pct === null ? 'Tidak ada data PD' : `${pct.toFixed(1)}% coverage`
  return `<div style="min-width:180px">
    <strong>${loc.kecamatan}</strong><br/>
    <span style="font-size:11px;color:#64748b">${loc.kabkota}, ${loc.provinsi}</span><br/>
    <hr style="margin:4px 0;border-color:#e2e8f0"/>
    <span style="font-size:12px">SPPG: <strong>${loc.jumlah_sppg}</strong> &times; ${porsi.value.toLocaleString('id-ID')} porsi</span><br/>
    <span style="font-size:12px">${pd}</span><br/>
    <span style="font-size:12px">${cov}</span></div>`
}

onMounted(async () => {
  const [kec, geo, stunting] = await Promise.all([
    fetch(`${API}/kecamatan`).then(r => r.json()),
    fetch('/geo/indonesia-38.geojson').then(r => r.json()),
    fetch(`${API}/stunting`).then(r => r.json()),
  ])
  locations.value = kec.filter(d => d.lat && d.lon)
  const byProv = {}
  for (const s of stunting) byProv[s.provinsi.toUpperCase()] = s
  await nextTick()
  initMap(geo, byProv)
})

onUnmounted(() => { if (map) { map.remove(); map = null } })

function initMap(geo, stuntingByProv) {
  map = L.map(mapContainer.value, { center: [-2.5, 118], zoom: 5, zoomSnap: 0.5 })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>', maxZoom: 18,
  }).addTo(map)

  // titik SPPG
  markersLayer = L.layerGroup()
  for (const loc of locations.value) {
    const radius = Math.max(5, Math.min(20, Math.sqrt((loc.jumlah_sppg || 1)) * 3))
    const circle = L.circleMarker([loc.lat, loc.lon], {
      radius, fillColor: tierColor(loc.tier), color: '#fff', weight: 1.5, opacity: 0.9, fillOpacity: 0.7,
    })
    circle.bindPopup(markerPopup(loc, loc.coverage_persen === null ? null : Number(loc.coverage_persen)))
    markersLayer.addLayer(circle)
    markers.push({ loc, circle })
  }

  // choropleth stunting
  stuntingLayer = L.geoJSON(geo, {
    style: (f) => {
      const s = stuntingByProv[(f.properties.PROVINSI || '').toUpperCase()]
      return { fillColor: stuntingColor(s ? Number(s.prevalensi) : null), weight: 1, color: '#fff', fillOpacity: 0.7 }
    },
    onEachFeature: (f, layer) => {
      const nama = f.properties.PROVINSI
      const s = stuntingByProv[(nama || '').toUpperCase()]
      layer.bindTooltip(`<strong>${nama}</strong><br/>Stunting 2024: ${s ? Number(s.prevalensi) + '% — ' + s.kategori : 'tidak ada data'}`, { sticky: true })
    },
  })

  recolor()
  applyMode()

  if (locations.value.length > 0) {
    const bounds = L.featureGroup(locations.value.map(l => L.circleMarker([l.lat, l.lon]))).getBounds()
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 7 })
  }
}

function applyMode() {
  if (!map) return
  if (markersLayer && map.hasLayer(markersLayer)) map.removeLayer(markersLayer)
  if (stuntingLayer && map.hasLayer(stuntingLayer)) map.removeLayer(stuntingLayer)
  if (mode.value !== 'sppg' && stuntingLayer) {
    stuntingLayer.setStyle({ fillOpacity: mode.value === 'both' ? 0.45 : 0.7 })
    stuntingLayer.addTo(map)
  }
  if (mode.value !== 'stunting' && markersLayer) markersLayer.addTo(map)
}

function setMode(m) { mode.value = m; applyMode() }
</script>
