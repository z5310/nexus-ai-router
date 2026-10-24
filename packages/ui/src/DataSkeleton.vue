<script setup lang="ts">
import ASkeleton from 'ant-design-vue/es/skeleton'

withDefaults(defineProps<{
  rows?: number
  compact?: boolean
  label?: string
}>(), {
  rows: 4,
  compact: false,
  label: '正在加载内容',
})
</script>

<template>
  <div
    class="nexus-data-skeleton w-full rounded-14px border border-white/7 bg-white/[0.018] p-5"
    :class="compact ? 'min-h-28 p-4' : 'min-h-52'"
    role="status"
    :aria-label="label"
    aria-live="polite"
  >
    <ASkeleton active :title="{ width: compact ? '28%' : '36%' }" :paragraph="{ rows, width: compact ? '100%' : ['100%', '92%', '96%', '72%'] }" />
    <span class="sr-only">{{ label }}</span>
  </div>
</template>
