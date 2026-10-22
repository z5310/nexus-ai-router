<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted } from 'vue'

defineProps<{ title: string; description?: string; busy?: boolean }>()
const emit = defineEmits<{ close: [] }>()
function onKeydown(event: KeyboardEvent) { if (event.key === 'Escape') emit('close') }
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="console-modal-backdrop" @mousedown.self="!busy && emit('close')">
      <section class="console-modal" role="dialog" aria-modal="true" :aria-label="title">
        <header><div><h2>{{ title }}</h2><p v-if="description">{{ description }}</p></div><button type="button" :disabled="busy" aria-label="关闭" @click="emit('close')"><X :size="18" /></button></header>
        <slot />
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.console-modal-backdrop { position: fixed; z-index: 120; inset: 0; display: grid; place-items: center; padding: 22px; background: rgba(1,7,3,.72); backdrop-filter: blur(8px); }
.console-modal { width: min(500px,100%); max-height: calc(100vh - 44px); overflow: auto; color: #ffffff; border: 1px solid rgba(255,255,255,.1); border-radius: 18px; background: #101a13; box-shadow: 0 30px 90px rgba(0,0,0,.48); }
.console-modal > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding: 21px 22px 18px; border-bottom: 1px solid rgba(255,255,255,.07); }
.console-modal h2 { margin: 0; font-size: 18px; letter-spacing: -.02em; }.console-modal p { margin: 6px 0 0; color: #708077; font-size: 11px; line-height: 1.55; }
.console-modal header button { display: grid; place-items: center; padding: 5px; color: #7d8c82; border: 0; border-radius: 7px; background: transparent; }.console-modal header button:hover { color: #e4eee7; background: rgba(255,255,255,.05); }
</style>
