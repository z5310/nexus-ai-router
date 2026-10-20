<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

interface BorderGlowProps {
  as?: string
  edgeSensitivity?: number
  backgroundColor?: string
  glowColor?: string
  glowRadius?: number
  glowIntensity?: number
  coneSpread?: number
  animated?: boolean
  colors?: string[]
  fillOpacity?: number
  borderWidth?: number
  sweepDelay?: number
}

const props = withDefaults(defineProps<BorderGlowProps>(), {
  as: 'div',
  edgeSensitivity: 28,
  backgroundColor: '#111e17',
  glowColor: '145 70 65',
  glowRadius: 28,
  glowIntensity: 0.72,
  coneSpread: 24,
  animated: true,
  colors: () => ['#63e495', '#b8f5cd', '#74d8c1'],
  fillOpacity: 0.16,
  borderWidth: 1,
  sweepDelay: 0,
})

const host = useTemplateRef<HTMLElement>('host')
const isHovered = ref(false)
const cursorAngle = ref(45)
const edgeProximity = ref(0)
const sweepActive = ref(false)
const frameIds = new Set<number>()
const timerIds = new Set<number>()

const parseHsl = (value: string) => {
  const match = value.match(/([\d.]+)\s+([\d.]+)%?\s+([\d.]+)%?/)
  return match ? { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) } : { h: 145, s: 70, l: 65 }
}

const buildBoxShadow = (color: string, intensity: number) => {
  const { h, s, l } = parseHsl(color)
  const layers: Array<[number, number, number, boolean]> = [
    [1, 0, 62, true], [4, 0, 40, true], [10, 0, 24, true], [24, 1, 13, true],
    [2, 0, 45, false], [7, 0, 28, false], [18, 1, 15, false], [38, 2, 7, false],
  ]

  return layers
    .map(([blur, spread, alpha, inset]) => `${inset ? 'inset ' : ''}0 0 ${blur}px ${spread}px hsl(${h}deg ${s}% ${l}% / ${Math.min(alpha * intensity, 100)}%)`)
    .join(', ')
}

const gradients = computed(() => {
  const positions = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%']
  const colorMap = [0, 1, 2, 0, 1, 2, 1]
  const colors = props.colors.length ? props.colors : ['#63e495']
  return positions.map((position, index) => {
    const color = colors[Math.min(colorMap[index], colors.length - 1)]
    return `radial-gradient(at ${position}, ${color} 0, transparent 50%)`
  })
})

const angle = computed(() => `${cursorAngle.value.toFixed(3)}deg`)
const isVisible = computed(() => isHovered.value || sweepActive.value)
const colorSensitivity = computed(() => props.edgeSensitivity + 20)
const borderOpacity = computed(() => isVisible.value
  ? Math.max(0, (edgeProximity.value * 100 - colorSensitivity.value) / (100 - colorSensitivity.value))
  : 0)
const glowOpacity = computed(() => isVisible.value
  ? Math.max(0, (edgeProximity.value * 100 - props.edgeSensitivity) / (100 - props.edgeSensitivity))
  : 0)

const borderBackground = computed(() => [
  `linear-gradient(${props.backgroundColor} 0 100%) padding-box`,
  'linear-gradient(rgb(255 255 255 / 0%) 0 100%) border-box',
  ...gradients.value.map((gradient) => `${gradient} border-box`),
].join(', '))

const fillBackground = computed(() => gradients.value.map((gradient) => `${gradient} padding-box`).join(', '))
const transition = computed(() => isVisible.value ? 'opacity .25s ease-out' : 'opacity .65s ease-in-out')

const getEdgeProximity = (element: HTMLElement, x: number, y: number) => {
  const { width, height } = element.getBoundingClientRect()
  const dx = x - width / 2
  const dy = y - height / 2
  const kx = dx === 0 ? Infinity : width / 2 / Math.abs(dx)
  const ky = dy === 0 ? Infinity : height / 2 / Math.abs(dy)
  return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1)
}

const getCursorAngle = (element: HTMLElement, x: number, y: number) => {
  const { width, height } = element.getBoundingClientRect()
  const radians = Math.atan2(y - height / 2, x - width / 2)
  const degrees = radians * (180 / Math.PI) + 90
  return degrees < 0 ? degrees + 360 : degrees
}

const handlePointerMove = (event: PointerEvent) => {
  if (!host.value) return
  const rect = host.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  edgeProximity.value = getEdgeProximity(host.value, x, y)
  cursorAngle.value = getCursorAngle(host.value, x, y)
}

const animateValue = (
  start: number,
  end: number,
  duration: number,
  delay: number,
  ease: (value: number) => number,
  update: (value: number) => void,
  complete?: () => void,
) => {
  const timer = window.setTimeout(() => {
    timerIds.delete(timer)
    const startedAt = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1)
      update(start + (end - start) * ease(progress))
      if (progress < 1) {
        const frame = requestAnimationFrame(tick)
        frameIds.add(frame)
      } else {
        complete?.()
      }
    }
    const frame = requestAnimationFrame(tick)
    frameIds.add(frame)
  }, delay)
  timerIds.add(timer)
}

const startSweep = () => {
  if (!props.animated || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const easeOut = (value: number) => 1 - Math.pow(1 - value, 3)
  const easeIn = (value: number) => value ** 3
  const start = 110
  const end = 465

  sweepActive.value = true
  cursorAngle.value = start
  animateValue(0, 1, 500, props.sweepDelay, easeOut, (value) => { edgeProximity.value = value })
  animateValue(start, start + (end - start) * .5, 1500, props.sweepDelay, easeIn, (value) => { cursorAngle.value = value })
  animateValue(start + (end - start) * .5, end, 2250, props.sweepDelay + 1500, easeOut, (value) => { cursorAngle.value = value })
  animateValue(1, 0, 1500, props.sweepDelay + 2500, easeIn, (value) => { edgeProximity.value = value }, () => { sweepActive.value = false })
}

onMounted(startSweep)
onBeforeUnmount(() => {
  timerIds.forEach((id) => window.clearTimeout(id))
  frameIds.forEach((id) => cancelAnimationFrame(id))
})
</script>

<template>
  <component
    :is="as"
    ref="host"
    class="border-glow"
    @pointermove="handlePointerMove"
    @pointerenter="isHovered = true"
    @pointerleave="isHovered = false"
  >
    <span
      aria-hidden="true"
      class="border-glow__border"
      :style="{
        borderWidth: `${borderWidth}px`,
        background: borderBackground,
        opacity: borderOpacity,
        maskImage: `conic-gradient(from ${angle} at center, #000 ${coneSpread}%, transparent ${coneSpread + 15}%, transparent ${100 - coneSpread - 15}%, #000 ${100 - coneSpread}%)`,
        WebkitMaskImage: `conic-gradient(from ${angle} at center, #000 ${coneSpread}%, transparent ${coneSpread + 15}%, transparent ${100 - coneSpread - 15}%, #000 ${100 - coneSpread}%)`,
        transition,
      }"
    />
    <span
      aria-hidden="true"
      class="border-glow__fill"
      :style="{
        borderWidth: `${borderWidth}px`,
        background: fillBackground,
        opacity: borderOpacity * fillOpacity,
        maskImage: `radial-gradient(ellipse at 50% 50%, #000 35%, transparent 68%), conic-gradient(from ${angle} at center, transparent 5%, #000 16%, #000 84%, transparent 95%)`,
        WebkitMaskImage: `radial-gradient(ellipse at 50% 50%, #000 35%, transparent 68%), conic-gradient(from ${angle} at center, transparent 5%, #000 16%, #000 84%, transparent 95%)`,
        transition,
      }"
    />
    <span
      aria-hidden="true"
      class="border-glow__outer"
      :style="{
        inset: `-${glowRadius}px`,
        opacity: glowOpacity,
        maskImage: `conic-gradient(from ${angle} at center, #000 2.5%, transparent 10%, transparent 90%, #000 97.5%)`,
        WebkitMaskImage: `conic-gradient(from ${angle} at center, #000 2.5%, transparent 10%, transparent 90%, #000 97.5%)`,
        transition,
      }"
    >
      <span :style="{ inset: `${glowRadius}px`, boxShadow: buildBoxShadow(glowColor, glowIntensity) }" />
    </span>
    <slot />
  </component>
</template>

<style scoped>
.border-glow {
  isolation: isolate;
  transform: translate3d(0, 0, .01px);
}

.border-glow__border,
.border-glow__fill,
.border-glow__outer {
  position: absolute;
  z-index: 1;
  border-style: solid;
  border-color: transparent;
  border-radius: inherit;
  pointer-events: none;
}

.border-glow__border,
.border-glow__fill {
  inset: 0;
}

.border-glow__outer {
  border: 0;
  mix-blend-mode: plus-lighter;
}

.border-glow__outer > span {
  position: absolute;
  border-radius: inherit;
}
</style>
