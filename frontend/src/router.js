import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Overview', component: () => import('./pages/Overview.vue') },
  { path: '/peta', name: 'PetaDistribusi', component: () => import('./pages/PetaDistribusi.vue') },
  { path: '/data-sppg', name: 'DataSppg', component: () => import('./pages/DataSppg.vue') },
  { path: '/peserta-didik', name: 'PesertaDidik', component: () => import('./pages/PesertaDidik.vue') },
  { path: '/analisis', name: 'AnalisisCoverage', component: () => import('./pages/AnalisisCoverage.vue') },
  { path: '/laporan', name: 'Laporan', component: () => import('./pages/Laporan.vue') },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
