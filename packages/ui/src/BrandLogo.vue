<script setup lang="ts">
import { Blocks } from 'lucide-vue-next'
</script>

<template>
  <RouterLink class="brand" to="/" aria-label="Nexus API">
    <span class="brand-mark"><Blocks :size="19" /></span>
    <span class="brand-name">Nexus</span><span class="brand-suffix">API</span>
    <i class="brand-status" />
  </RouterLink>
</template>
