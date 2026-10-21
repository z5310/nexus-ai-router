<script setup lang="ts">
import { computed } from 'vue'
import anthropicLogo from '@lobehub/icons-static-svg/icons/claude-color.svg'
import baaiLogo from '@lobehub/icons-static-svg/icons/baai.svg'
import bytedanceLogo from '@lobehub/icons-static-svg/icons/bytedance-color.svg'
import deepseekLogo from '@lobehub/icons-static-svg/icons/deepseek-color.svg'
import geminiLogo from '@lobehub/icons-static-svg/icons/gemini-color.svg'
import minimaxLogo from '@lobehub/icons-static-svg/icons/minimax-color.svg'
import openaiLogo from '@lobehub/icons-static-svg/icons/openai.svg'
import qwenLogo from '@lobehub/icons-static-svg/icons/qwen-color.svg'

const props = withDefaults(defineProps<{
  owner?: string
  provider?: string
  name?: string
  accent?: string
  size?: number
}>(), {
  owner: '',
  provider: '',
  name: '',
  accent: '#63e495',
  size: 38,
})

const brand = computed(() => `${props.owner} ${props.provider} ${props.name}`.toLowerCase())
const logo = computed(() => {
  if (brand.value.includes('openai') || brand.value.includes('gpt')) return openaiLogo
  if (brand.value.includes('anthropic') || brand.value.includes('claude')) return anthropicLogo
  if (brand.value.includes('deepseek')) return deepseekLogo
  if (brand.value.includes('alibaba') || brand.value.includes('阿里') || brand.value.includes('qwen')) return qwenLogo
  if (brand.value.includes('google') || brand.value.includes('gemini')) return geminiLogo
  if (brand.value.includes('bytedance') || brand.value.includes('字节') || brand.value.includes('seed')) return bytedanceLogo
  if (brand.value.includes('minimax')) return minimaxLogo
  return baaiLogo
})
const monochrome = computed(() => logo.value === openaiLogo || logo.value === baaiLogo)
const label = computed(() => props.provider || props.owner || props.name)
</script>

<template>
  <span
    :class="['model-logo', { monochrome }]"
    :style="{ '--model-logo-accent': accent, '--model-logo-size': `${size}px` }"
    role="img"
    :aria-label="`${label} logo`"
    :title="label"
  >
    <img :src="logo" alt="" aria-hidden="true" />
  </span>
</template>

<style scoped>
.model-logo {
  width: var(--model-logo-size);
  height: var(--model-logo-size);
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  border: 1px solid color-mix(in srgb,var(--model-logo-accent) 24%,transparent);
  border-radius: calc(var(--model-logo-size) * .26);
  background: color-mix(in srgb,var(--model-logo-accent) 8%,#101812);
}
.model-logo.monochrome { background: color-mix(in srgb,var(--model-logo-accent) 78%,white); }
.model-logo img { width: 64%; height: 64%; display: block; object-fit: contain; }
</style>
