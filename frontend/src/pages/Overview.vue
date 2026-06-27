<template>
  <div>
    <h2 class="page-title">Overview Dapur SPPG</h2>

    <!-- Stat Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <div v-for="stat in stats" :key="stat.label" class="stat-card">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm text-slate-500">{{ stat.label }}</p>
          <component :is="stat.icon" class="w-5 h-5" :class="stat.color" />
        </div>
        <p class="text-2xl font-bold text-slate-800">{{ formatNum(stat.value) }}</p>
        <p class="text-xs text-slate-400 mt-1">{{ stat.sub }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Coverage Summary -->
      <div class="stat-card">
        <h3 class="font-semibold text-slate-700 mb-4">Coverage per Kecamatan</h3>
        <div v-if="coverageLoading" class="text-sm text-slate-400">Loading...</div>
        <div v-else>
          <div class="flex items-center gap-6 mb-4">
            <div>
              <p class="text-3xl font-bold" :class="coverageAvgColor">{{ coverage.rata_rata_coverage }}%</p>
              <p class="text-xs text-slate-400">Rata-rata</p>
            </div>
            <div class="h-12 w-px bg-slate-200" />
            <div class="flex gap-3 text-sm flex-wrap">
              <div><span class="inline-block w-3 h-3 rounded-full bg-green-700 mr-1" />Hijau tua <strong>{{ coverage.hijau_tua }}</strong></div>
              <div><span class="inline-block w-3 h-3 rounded-full bg-green-500 mr-1" />Hijau muda <strong>{{ coverage.hijau_muda }}</strong></div>
              <div><span class="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1" />Kuning <strong>{{ coverage.kuning }}</strong></div>
              <div><span class="inline-block w-3 h-3 rounded-full bg-red-500 mr-1" />Merah <strong>{{ coverage.merah }}</strong></div>
              <div><span class="inline-block w-3 h-3 rounded-full bg-slate-300 mr-1" />N/A <strong>{{ coverage.no_data }}</strong></div>
            </div>
          </div>
          <!-- Mini bar chart: distribusi merah/kuning/hijau muda/hijau tua -->
          <div class="h-3 rounded-full bg-slate-100 flex overflow-hidden">
            <div
              v-if="coverage.merah > 0"
              class="h-full bg-red-500 transition-all"
              :style="{ width: pctOf(coverage.merah) }"
              :title="coverage.merah + ' merah'"
            />
            <div
              v-if="coverage.kuning > 0"
              class="h-full bg-yellow-500 transition-all"
              :style="{ width: pctOf(coverage.kuning) }"
              :title="coverage.kuning + ' kuning'"
            />
            <div
              v-if="coverage.hijau_muda > 0"
              class="h-full bg-green-500 transition-all"
              :style="{ width: pctOf(coverage.hijau_muda) }"
              :title="coverage.hijau_muda + ' hijau muda'"
            />
            <div
              v-if="coverage.hijau_tua > 0"
              class="h-full bg-green-700 transition-all"
              :style="{ width: pctOf(coverage.hijau_tua) }"
              :title="coverage.hijau_tua + ' hijau tua'"
            />
          </div>
          <p class="text-xs text-slate-400 mt-2">
            {{ coverage.total_kecamatan }} kecamatan terdata &middot; {{ coverage.no_data }} tanpa data PD
          </p>
        </div>
      </div>

      <!-- Top Provinsi -->
      <div class="stat-card">
        <h3 class="font-semibold text-slate-700 mb-4">Distribusi per Provinsi</h3>
        <div v-if="distribusiLoading" class="text-sm text-slate-400">Loading...</div>
        <div v-else class="space-y-2 max-h-72 overflow-y-auto">
          <div
            v-for="d in distribusiTop"
            :key="d.provinsi"
            class="flex items-center justify-between text-sm py-1"
          >
            <span class="text-slate-700 truncate mr-2">{{ d.provinsi }}</span>
            <div class="flex items-center gap-3 flex-shrink-0">
              <span class="text-slate-500 text-xs">{{ d.total_kecamatan }} kec</span>
              <span class="font-medium text-slate-800 w-16 text-right">{{ formatNum(d.total_sppg) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Coverage by Provinsi chart -->
    <div class="stat-card">
      <h3 class="font-semibold text-slate-700 mb-4">Rata-rata Coverage per Provinsi</h3>
      <div v-if="provinsiLoading" class="text-sm text-slate-400">Loading...</div>
      <div v-else class="overflow-x-auto">
        <div class="space-y-2 min-w-[600px]">
          <div
            v-for="p in provinsiCoverage"
            :key="p.provinsi"
            class="flex items-center gap-3 text-sm"
          >
            <span class="w-40 truncate text-slate-600 flex-shrink-0">{{ p.provinsi }}</span>
            <div class="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :class="tierClass(p.rata_rata_coverage)"
                :style="{ width: Math.min(p.rata_rata_coverage, 100) + '%' }"
              />
            </div>
            <span class="w-14 text-right font-medium" :class="tierTextClass(p.rata_rata_coverage)">
              {{ p.rata_rata_coverage }}%
            </span>
            <span class="w-16 text-right text-slate-400 text-xs">
              {{ p.terdata }}/{{ p.total_kecamatan }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { MapPin, School, Users, Building2, Globe, TrendingUp } from 'lucide-vue-next'

const API = '/api'

const statsData = ref({})
const coverage = ref({})
const distribusiData = ref([])
const provinsiCoverageData = ref([])

const loading = ref(true)
const coverageLoading = ref(true)
const distribusiLoading = ref(true)
const provinsiLoading = ref(true)

const stats = computed(() => [
  { label: 'Total SPPG', value: statsData.value.total_sppg || 0, icon: School, color: 'text-sky-500', sub: 'Dapur SPPG di seluruh Indonesia' },
  { label: 'Kecamatan', value: statsData.value.total_kecamatan || 0, icon: MapPin, color: 'text-emerald-500', sub: 'Kecamatan dengan SPPG' },
  { label: 'Kabupaten/Kota', value: statsData.value.total_kabkota || 0, icon: Building2, color: 'text-violet-500', sub: 'Tersebar di kabupaten/kota' },
  { label: 'Provinsi', value: statsData.value.total_provinsi || 0, icon: Globe, color: 'text-orange-500', sub: 'Provinsi di Indonesia' },
  { label: 'Kecamatan PD', value: statsData.value.total_kecamatan_pd || 0, icon: Users, color: 'text-rose-500', sub: 'Kecamatan dengan data PD' },
  { label: 'Total PAUD+SD', value: statsData.value.total_paud_sd || 0, icon: TrendingUp, color: 'text-cyan-500', sub: 'Sasaran coverage SPPG' },
])

const distribusiTop = computed(() =>
  (distribusiData.value || []).slice(0, 15)
)

const provinsiCoverage = computed(() =>
  (provinsiCoverageData.value || []).filter(p => p.rata_rata_coverage > 0).slice(0, 20)
)

// Denominator distribusi tier (4 tingkat) untuk lebar mini-bar.
function pctOf(n) {
  const c = coverage.value
  const total = (Number(c.merah) || 0) + (Number(c.kuning) || 0) +
    (Number(c.hijau_muda) || 0) + (Number(c.hijau_tua) || 0)
  if (!total) return '0%'
  return ((Number(n) || 0) / total) * 100 + '%'
}

const coverageAvgColor = computed(() => tierTextClass(coverage.value.rata_rata_coverage || 0))

function tierClass(v) {
  if (v > 100) return 'bg-green-700'
  if (v >= 90) return 'bg-green-500'
  if (v >= 70) return 'bg-yellow-500'
  return 'bg-red-500'
}

function tierTextClass(v) {
  if (v > 100) return 'text-green-700'
  if (v >= 90) return 'text-green-600'
  if (v >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

function formatNum(n) {
  if (!n) return '0'
  return Number(n).toLocaleString('id-ID')
}

async function fetchAll() {
  const [s, c, d, p] = await Promise.all([
    fetch(`${API}/stats`).then(r => r.json()),
    fetch(`${API}/coverage`).then(r => r.json()),
    fetch(`${API}/distribusi`).then(r => r.json()),
    fetch(`${API}/coverage/provinsi`).then(r => r.json()),
  ])
  statsData.value = s
  coverage.value = c
  distribusiData.value = d
  provinsiCoverageData.value = p
  loading.value = false
  coverageLoading.value = false
  distribusiLoading.value = false
  provinsiLoading.value = false
}

onMounted(fetchAll)
</script>
