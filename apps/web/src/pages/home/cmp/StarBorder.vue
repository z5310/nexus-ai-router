<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

interface StarBorderProps {
  as?: string
  className?: string
  color?: string
  speed?: string
  thickness?: number
}

const props = withDefaults(defineProps<StarBorderProps>(), {
  as: 'button',
  className: '',
  color: 'white',
  speed: '6s',
  thickness: 1,
})

const attrs = useAttrs()
const componentStyle = computed(() => ({
  padding: `${props.thickness}px`,
  ...(attrs.style as Record<string, string> | undefined),
}))
</script>

<template>
  <component
    :is="as"
    v-bind="attrs"
    :class="['star-border', className]"
    :style="componentStyle"
  >
    <span
      aria-hidden="true"
      class="star-border__light star-border__light--bottom"
      :style="{ background: `radial-gradient(circle, ${color}, transparent 10%)`, animationDuration: speed }"
    />
    <span
      aria-hidden="true"
      class="star-border__light star-border__light--top"
      :style="{ background: `radial-gradient(circle, ${color}, transparent 10%)`, animationDuration: speed }"
    />
    <div class="star-border__content">
      <slot />
    </div>
  </component>
</template>

<style scoped>
.star-border { position: relative; display: block; overflow: hidden; border: 0; background: transparent; }
.star-border__light { position: absolute; z-index: 0; width: 300%; height: 50%; border-radius: 999px; opacity: .72; pointer-events: none; }
.star-border__light--bottom { right: -250%; bottom: -11px; animation: star-movement-bottom linear infinite alternate; }
.star-border__light--top { top: -10px; left: -250%; animation: star-movement-top linear infinite alternate; }
.star-border__content { position: relative; z-index: 1; height: 100%; border: 1px solid #232926; background: #07150c; }

@keyframes star-movement-bottom {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(-100%); }
}
@keyframes star-movement-top {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(100%); }
}
</style>
