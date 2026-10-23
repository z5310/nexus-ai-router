<script setup lang="ts" generic="T extends { name: string; mark?: string; color?: string }">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  logos: T[]
  speed?: number
  direction?: 'left' | 'right'
  gap?: number
  pauseOnHover?: boolean
  fadeOut?: boolean
  fadeOutColor?: string
  ariaLabel?: string
}>(), {
  speed: 52,
  direction: 'left',
  gap: 72,
  pauseOnHover: true,
  fadeOut: true,
  fadeOutColor: '#08130e',
  ariaLabel: 'Model services',
})

const containerRef = ref<HTMLDivElement | null>(null)
const trackRef = ref<HTMLDivElement | null>(null)
const sequenceRef = ref<HTMLUListElement | null>(null)
const sequenceWidth = ref(0)
const copyCount = ref(2)
const hovered = ref(false)
let frame: number | null = null
let lastTime: number | null = null
let offset = 0
let velocity = 0
let resizeObserver: ResizeObserver | null = null

const rootStyle = computed(() => ({
  '--logo-loop-gap': `${props.gap}px`,
  '--logo-loop-fade': props.fadeOutColor,
}))

const updateDimensions = async () => {
  await nextTick()
  const width = Math.ceil(sequenceRef.value?.getBoundingClientRect().width ?? 0)
  const viewport = containerRef.value?.clientWidth ?? 0
  if (!width) return
  sequenceWidth.value = width
  copyCount.value = Math.max(2, Math.ceil(viewport / width) + 2)
  offset %= width
}

const animate = (time: number) => {
  const track = trackRef.value
  if (!track) return
  if (lastTime === null) lastTime = time
  const delta = Math.min(.05, Math.max(0, time - lastTime) / 1000)
  lastTime = time
  const directionMultiplier = props.direction === 'left' ? 1 : -1
  const target = hovered.value && props.pauseOnHover ? 0 : props.speed * directionMultiplier
  velocity += (target - velocity) * (1 - Math.exp(-delta / .25))
  if (sequenceWidth.value > 0) {
    offset = ((offset + velocity * delta) % sequenceWidth.value + sequenceWidth.value) % sequenceWidth.value
    track.style.transform = `translate3d(${-offset}px,0,0)`
  }
  frame = requestAnimationFrame(animate)
}

onMounted(async () => {
  await updateDimensions()
  resizeObserver = new ResizeObserver(updateDimensions)
  if (containerRef.value) resizeObserver.observe(containerRef.value)
  if (sequenceRef.value) resizeObserver.observe(sequenceRef.value)
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) frame = requestAnimationFrame(animate)
})

onUnmounted(() => {
  if (frame !== null) cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div ref="containerRef" class="logo-loop" :style="rootStyle" role="region" :aria-label="ariaLabel">
    <div v-if="fadeOut" class="logo-loop-fade fade-left" aria-hidden="true" />
    <div v-if="fadeOut" class="logo-loop-fade fade-right" aria-hidden="true" />
    <div ref="trackRef" class="logo-loop-track" @mouseenter="hovered = true" @mouseleave="hovered = false">
      <ul v-for="copyIndex in copyCount" :key="copyIndex" :ref="el => { if (copyIndex === 1) sequenceRef = el as HTMLUListElement }" :aria-hidden="copyIndex > 1">
        <li v-for="logo in logos" :key="`${copyIndex}-${logo.name}`">
          <slot name="renderItem" :item="logo">
            <span class="logo-loop-mark" :style="{ '--logo-color': logo.color ?? '#90a399' }">{{ logo.mark ?? logo.name.charAt(0) }}</span>
            <b>{{ logo.name }}</b>
          </slot>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.logo-loop { position: relative; width: 100%; overflow: hidden; }
.logo-loop-track { position: relative; z-index: 0; width: max-content; display: flex; will-change: transform; user-select: none; }
.logo-loop-track ul { display: flex; align-items: center; flex: none; margin: 0; padding: 0; list-style: none; }
.logo-loop-track li { display: flex; flex: none; align-items: center; gap: 10px; margin-right: var(--logo-loop-gap); color: #7f9186; transition: color .25s; }
.logo-loop-track li:hover { color: #d5e6da; }
.logo-loop-track b { font-size: 15px; font-weight: 650; letter-spacing: -.025em; white-space: nowrap; }
.logo-loop-mark { width: 29px; height: 29px; display: grid; place-items: center; color: var(--logo-color); border: 1px solid color-mix(in srgb,var(--logo-color) 24%,transparent); border-radius: 9px; background: color-mix(in srgb,var(--logo-color) 7%,transparent); font-size: 10px; font-weight: 800; }
.logo-loop-fade { position: absolute; z-index: 2; inset-block: 0; width: clamp(28px,9vw,130px); pointer-events: none; }
.fade-left { left: 0; background: linear-gradient(to right,var(--logo-loop-fade),transparent); }
.fade-right { right: 0; background: linear-gradient(to left,var(--logo-loop-fade),transparent); }
@media (prefers-reduced-motion: reduce) { .logo-loop-track { transform: none!important; } }
</style>
