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
    <div class="fixed inset-0 z-120 grid place-items-center bg-[rgba(1,7,3,.72)] p-[22px] backdrop-blur-[8px]" @mousedown.self="!busy && emit('close')">
      <section class="max-h-[calc(100vh-44px)] w-[min(500px,100%)] overflow-auto rounded-[18px] border border-white/10 bg-[#101a13] text-white shadow-[0_30px_90px_rgba(0,0,0,.48)]" role="dialog" aria-modal="true" :aria-label="title">
        <header class="flex items-start justify-between gap-5 border-b border-white/7 px-[22px] pb-[18px] pt-[21px]"><div><h2 class="m-0 text-lg tracking-[-.02em]">{{ title }}</h2><p v-if="description" class="mb-0 mt-1.5 text-[11px] leading-[1.55] text-[#708077]">{{ description }}</p></div><button class="grid place-items-center rounded-7px border-0 bg-transparent p-1.25 text-[#7d8c82] hover:bg-white/5 hover:text-[#e4eee7]" type="button" :disabled="busy" aria-label="关闭" @click="emit('close')"><X :size="18" /></button></header>
        <slot />
      </section>
    </div>
  </Teleport>
</template>
