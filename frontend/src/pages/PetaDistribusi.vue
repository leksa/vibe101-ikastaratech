<template>
  <div class="h-full flex flex-col">
    <h2 class="page-title">Peta Distribusi SPPG</h2>

    <!-- Legend -->
    <div class="flex items-center gap-4 mb-3 text-xs bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 self-start flex-wrap">
      <span class="text-slate-500 font-medium">Legenda:</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-700 inline-block" />Hijau tua (&gt;100%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-500 inline-block" />Hijau muda (90-100%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-yellow-500 inline-block" />Kuning (70-89%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-red-500 inline-block" />Merah (&lt;70%)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-slate-400 inline-block" />Tidak ada data PD</span>
      <div class="h-4 w-px bg-slate-200 mx-1" />
      <span class="text-slate-400">Total: <strong class="text-slate-700">{{ locations.length }}</strong> kecamatan</span>
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
let map = null
let markersLayer = null

onMounted(async () => {
  const data = await fetch(`${API}/kecamatan`).then(r => r.json())
  locations.value = data.filter(d => d.lat && d.lon)

  await nextTick()
  initMap()
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

function tierColor(tier) {
  if (tier === 'hijau_tua') return '#15803d'
  if (tier === 'hijau_muda') return '#22c55e'
  if (tier === 'kuning') return '#eab308'
  if (tier === 'merah') return '#ef4444'
  return '#94a3b8'
}

function initMap() {
  map = L.map(mapContainer.value, {
    center: [-2.5, 118],
    zoom: 5,
    zoomSnap: 0.5,
    attributionControl: true,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 18,
  }).addTo(map)

  markersLayer = L.layerGroup().addTo(map)

  for (const loc of locations.value) {
    const radius = Math.max(5, Math.min(20, Math.sqrt((loc.jumlah_sppg || 1)) * 3))
    const color = tierColor(loc.tier)

    const circle = L.circleMarker([loc.lat, loc.lon], {
      radius,
      fillColor: color,
      color: '#fff',
      weight: 1.5,
      opacity: 0.9,
      fillOpacity: 0.7,
    })

    const pdInfo = loc.penerima_pd
      ? `${Number(loc.penerima_pd).toLocaleString('id-ID')} PD`
      : 'Tidak ada data PD'

    const coverageInfo = loc.coverage_persen !== null
      ? `${loc.coverage_persen}% coverage`
      : ''

    circle.bindPopup(`
      <div style="min-width:180px">
        <strong>${loc.kecamatan}</strong><br/>
        <span style="font-size:11px;color:#64748b">${loc.kabkota}, ${loc.provinsi}</span><br/>
        <hr style="margin:4px 0;border-color:#e2e8f0"/>
        <span style="font-size:12px">SPPG: <strong>${loc.jumlah_sppg}</strong></span><br/>
        <span style="font-size:12px">${pdInfo}</span><br/>
        ${coverageInfo ? `<span style="font-size:12px">${coverageInfo}</span>` : ''}
      </div>
    `)

    markersLayer.addLayer(circle)
  }

  // Fit bounds if we have data
  if (locations.value.length > 0) {
    const bounds = L.featureGroup(
      locations.value.map(l => L.circleMarker([l.lat, l.lon]))
    ).getBounds()
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 7 })
  }
}
</script>
