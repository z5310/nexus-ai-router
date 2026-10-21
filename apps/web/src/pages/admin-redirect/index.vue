<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
onMounted(() => {
  const adminBase = import.meta.env.VITE_ADMIN_URL ?? 'http://localhost:5174'
  const suffix = route.fullPath.replace(/^\/admin/, '')
  window.location.replace(`${adminBase}/admin${suffix}`)
})
</script>

<template><main class="admin-redirect"><span>正在进入 Nexus 平台管理后台…</span></main></template>

<style scoped>
.admin-redirect{min-height:100vh;display:grid;place-items:center;color:#7f9185;background:#070d09;font-size:14px}
</style>
