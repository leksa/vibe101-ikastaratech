<template>
  <aside class="w-56 bg-sidebar-bg flex-shrink-0 flex flex-col h-screen">
    <div class="p-4 border-b border-slate-700/50">
      <h1 class="text-white font-semibold text-sm leading-tight">
        Dashboard Monitoring<br />Dapur SPPG
      </h1>
      <p class="text-slate-400 text-xs mt-1">Kementerian Pendidikan</p>
    </div>

    <nav class="flex-1 py-3 space-y-1 px-2">
      <router-link
        v-for="item in menu"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
        :class="$route.path === item.path
          ? 'bg-sidebar-active text-white'
          : 'text-slate-300 hover:bg-sidebar-hover hover:text-white'"
      >
        <component :is="item.icon" class="w-4 h-4 flex-shrink-0" />
        <span>{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="p-4 border-t border-slate-700/50">
      <p class="text-slate-500 text-xs">v1.0.0 &middot; Prototype</p>
    </div>
  </aside>
</template>

<script setup>
import {
  LayoutDashboard,
  Map,
  Table2,
  Users,
  BarChart3,
  FileText,
} from 'lucide-vue-next'

const menu = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/peta', label: 'Peta Distribusi', icon: Map },
  { path: '/data-sppg', label: 'Data SPPG', icon: Table2 },
  { path: '/peserta-didik', label: 'Peserta Didik', icon: Users },
  { path: '/analisis', label: 'Analisis Coverage', icon: BarChart3 },
  { path: '/laporan', label: 'Laporan', icon: FileText },
]
</script>
