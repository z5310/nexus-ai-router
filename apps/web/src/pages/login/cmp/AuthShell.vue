<script setup lang="ts">
import { ArrowLeft, LockKeyhole } from 'lucide-vue-next'
import BrandLogo from '../../../components/BrandLogo.vue'

defineProps<{ kicker: string; title: string; description: string }>()
</script>

<template>
  <main class="login-page">
    <div class="login-backdrop"><i /><i /><i /></div>
    <header><BrandLogo /><RouterLink to="/"><ArrowLeft :size="17" />返回首页</RouterLink></header>
    <section class="login-card">
      <div class="login-mark"><LockKeyhole :size="24" /></div>
      <span>{{ kicker }}</span>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
      <slot />
    </section>
  </main>
</template>
