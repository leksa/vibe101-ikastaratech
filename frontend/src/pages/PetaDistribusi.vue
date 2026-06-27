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

    <!-- Legend: SPPG markers -->
    <div v-if="mode !== 'stunting'" class="flex items-center gap-4 mb-3 text-xs bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 self-start flex-wrap">
      <span class="text-slate-500 font-medium">Coverage SPPG:</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-700 inline-block" />Hijau tua (&gt;100%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-500 inline-block" />Hijau muda (90-100%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-yellow-500 inline-block" />Kuning (70-89%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-red-500 inline-block" />Merah (&lt;70%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-slate-400 inline-block" />Tanpa data PD</span>
      <div class="h-4 w-px bg-slate-200 mx-1" />
      <span class="text-slate-400">Total: <strong class="text-slate-700">{{ locations.length }}</strong> kecamatan</span>
    </div>

    <!-- Legend: stunting choropleth -->
    <div v-if="mode !== 'sppg'" class="flex items-center gap-4 mb-3 text-xs bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 self-start flex-wrap">
      <span class="text-slate-500 font-medium">Prevalensi stunting 2024:</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm inline-block" style="background:#16a34a" />Rendah (&lt;20%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm inline-block" style="background:#eab308" />Sedang (20-29%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm inline-block" style="background:#f97316" />Tinggi (30-39%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm inline-block" style="background:#dc2626" />Sangat Tinggi (&ge;40%)</span>
      <div class="h-4 w-px bg-slate-200 mx-1" />
      <span class="text-slate-400">Sumber: SSGI/SKI 2024 · 38 provinsi</span>
    </div>

    <!-- Map -->
    <div ref="mapContainer" class="flex-1 rounded-xl border border-slate-200 shadow-sm min-h-[500px]" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import L from 'leaflet'

const API = '/api'
const mapContainer = ref(null)
const locations = ref([])
const mode = ref('sppg')
const modes = [
  { key: 'sppg', label: 'Titik SPPG (coverage)' },
  { key: 'stunting', label: 'Choropleth stunting' },
  { key: 'both', label: 'Keduanya (overlay)' },
]

let map = null
let markersLayer = null     // titik SPPG
let stuntingLayer = null    // choropleth provinsi

// --- warna ---
function tierColor(tier) {
  if (tier === 'hijau_tua') return '#15803d'
  if (tier === 'hijau_muda') return '#22c55e'
  if (tier === 'kuning') return '#eab308'
  if (tier === 'merah') return '#ef4444'
  return '#94a3b8'
}
// stunting: makin tinggi makin buruk (merah)
function stuntingColor(prevalensi) {
  if (prevalensi == null) return '#cbd5e1'
  if (prevalensi < 20) return '#16a34a'
  if (prevalensi < 30) return '#eab308'
  if (prevalensi < 40) return '#f97316'
  return '#dc2626'
}

onMounted(async () => {
  const [kec, geo, stunting] = await Promise.all([
    fetch(`${API}/kecamatan`).then(r => r.json()),
    fetch('/geo/indonesia-38.geojson').then(r => r.json()),
    fetch(`${API}/stunting`).then(r => r.json()),
  ])
  locations.value = kec.filter(d => d.lat && d.lon)

  // index stunting by UPPER(provinsi) untuk join ke properti PROVINSI GeoJSON
  const byProv = {}
  for (const s of stunting) byProv[s.provinsi.toUpperCase()] = s

  await nextTick()
  initMap(geo, byProv)
})

onUnmounted(() => {
  if (map) { map.remove(); map = null }
})

function initMap(geo, stuntingByProv) {
  map = L.map(mapContainer.value, {
    center: [-2.5, 118], zoom: 5, zoomSnap: 0.5, attributionControl: true,
  })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 18,
  }).addTo(map)

  // --- layer titik SPPG ---
  markersLayer = L.layerGroup()
  for (const loc of locations.value) {
    const radius = Math.max(5, Math.min(20, Math.sqrt((loc.jumlah_sppg || 1)) * 3))
    const circle = L.circleMarker([loc.lat, loc.lon], {
      radius, fillColor: tierColor(loc.tier), color: '#fff',
      weight: 1.5, opacity: 0.9, fillOpacity: 0.7,
    })
    const pdInfo = loc.paud_sd_pd ? `${Number(loc.paud_sd_pd).toLocaleString('id-ID')} PD` : 'Tidak ada data PD'
    const cov = loc.coverage_persen !== null ? `${loc.coverage_persen}% coverage` : ''
    circle.bindPopup(`
      <div style="min-width:180px">
        <strong>${loc.kecamatan}</strong><br/>
        <span style="font-size:11px;color:#64748b">${loc.kabkota}, ${loc.provinsi}</span><br/>
        <hr style="margin:4px 0;border-color:#e2e8f0"/>
        <span style="font-size:12px">SPPG: <strong>${loc.jumlah_sppg}</strong></span><br/>
        <span style="font-size:12px">${pdInfo}</span><br/>
        ${cov ? `<span style="font-size:12px">${cov}</span>` : ''}
      </div>`)
    markersLayer.addLayer(circle)
  }

  // --- layer choropleth stunting ---
  stuntingLayer = L.geoJSON(geo, {
    style: (feature) => {
      const s = stuntingByProv[(feature.properties.PROVINSI || '').toUpperCase()]
      return {
        fillColor: stuntingColor(s ? Number(s.prevalensi) : null),
        weight: 1, color: '#ffffff', fillOpacity: 0.7,
      }
    },
    onEachFeature: (feature, layer) => {
      const nama = feature.properties.PROVINSI
      const s = stuntingByProv[(nama || '').toUpperCase()]
      const val = s ? `${Number(s.prevalensi)}% — <strong>${s.kategori}</strong>` : 'tidak ada data'
      layer.bindTooltip(`<strong>${nama}</strong><br/>Stunting 2024: ${val}`, { sticky: true })
      layer.bindPopup(`
        <div style="min-width:160px">
          <strong>${nama}</strong><br/>
          <hr style="margin:4px 0;border-color:#e2e8f0"/>
          <span style="font-size:12px">Prevalensi stunting 2024: <strong>${s ? Number(s.prevalensi) + '%' : '—'}</strong></span><br/>
          <span style="font-size:12px">Kategori: ${s ? s.kategori : '—'}</span>
        </div>`)
    },
  })

  applyMode()

  if (locations.value.length > 0) {
    const bounds = L.featureGroup(
      locations.value.map(l => L.circleMarker([l.lat, l.lon]))
    ).getBounds()
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 7 })
  }
}

function applyMode() {
  if (!map) return
  // Remove keduanya lalu add berurutan -> z-order pasti: choropleth bawah, titik atas.
  if (markersLayer && map.hasLayer(markersLayer)) map.removeLayer(markersLayer)
  if (stuntingLayer && map.hasLayer(stuntingLayer)) map.removeLayer(stuntingLayer)

  if (mode.value !== 'sppg' && stuntingLayer) {
    stuntingLayer.setStyle({ fillOpacity: mode.value === 'both' ? 0.45 : 0.7 }) // pudar saat overlay
    stuntingLayer.addTo(map)
  }
  if (mode.value !== 'stunting' && markersLayer) {
    markersLayer.addTo(map)
  }
}

function setMode(m) {
  mode.value = m
  applyMode()
}
</script>
