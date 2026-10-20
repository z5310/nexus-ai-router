<template>
  <div ref="containerRef" class="side-rays" aria-hidden="true" />
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Mesh, Program, Renderer, Triangle } from 'ogl'

export type SideRaysOrigin = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

const props = withDefaults(defineProps<{
  speed?: number
  rayColor1?: string
  rayColor2?: string
  intensity?: number
  spread?: number
  origin?: SideRaysOrigin
  tilt?: number
  saturation?: number
  blend?: number
  falloff?: number
  opacity?: number
}>(), {
  speed: 2.5,
  rayColor1: '#27FF64',
  rayColor2: '#A8FFB6',
  intensity: 2,
  spread: 2,
  origin: 'top-right',
  tilt: 0,
  saturation: 1.5,
  blend: .75,
  falloff: 2,
  opacity: 1,
})

type Uniforms = {
  iTime: { value: number }
  iResolution: { value: [number, number] }
  iSpeed: { value: number }
  iRayColor1: { value: [number, number, number] }
  iRayColor2: { value: [number, number, number] }
  iIntensity: { value: number }
  iSpread: { value: number }
  iFlipX: { value: number }
  iFlipY: { value: number }
  iTilt: { value: number }
  iSaturation: { value: number }
  iBlend: { value: number }
  iFalloff: { value: number }
  iOpacity: { value: number }
}

const containerRef = ref<HTMLDivElement | null>(null)
const uniformsRef = ref<Uniforms | null>(null)
const rendererRef = ref<Renderer | null>(null)
const meshRef = ref<Mesh | null>(null)
const animationFrame = ref<number | null>(null)
const visible = ref(false)
let intersectionObserver: IntersectionObserver | null = null
let resizeObserver: ResizeObserver | null = null

const hexToRgb = (hex: string): [number, number, number] => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return match
    ? [Number.parseInt(match[1], 16) / 255, Number.parseInt(match[2], 16) / 255, Number.parseInt(match[3], 16) / 255]
    : [1, 1, 1]
}

const originToFlip = (origin: SideRaysOrigin): [number, number] => {
  if (origin === 'top-left') return [1, 0]
  if (origin === 'bottom-right') return [0, 1]
  if (origin === 'bottom-left') return [1, 1]
  return [0, 0]
}

const rayColor1 = computed(() => hexToRgb(props.rayColor1))
const rayColor2 = computed(() => hexToRgb(props.rayColor2))
const flip = computed(() => originToFlip(props.origin))

const vertexShader = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`

const fragmentShader = `
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform float iSpeed;
uniform vec3 iRayColor1;
uniform vec3 iRayColor2;
uniform float iIntensity;
uniform float iSpread;
uniform float iFlipX;
uniform float iFlipY;
uniform float iTilt;
uniform float iSaturation;
uniform float iBlend;
uniform float iFalloff;
uniform float iOpacity;

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);
  return clamp(
    (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)),
    0.0, 1.0
  ) * clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;
  if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;

  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  vec2 rayPos = vec2(iResolution.x * 1.1, -0.5 * iResolution.y);
  float tiltRad = iTilt * 3.14159265 / 180.0;
  float cs = cos(tiltRad);
  float sn = sin(tiltRad);
  vec2 rel = coord - rayPos;
  vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;

  float halfSpread = iSpread * 0.275;
  vec2 rayRefDir1 = normalize(vec2(cos(0.785398 + halfSpread), sin(0.785398 + halfSpread)));
  vec2 rayRefDir2 = normalize(vec2(cos(0.785398 - halfSpread), sin(0.785398 - halfSpread)));
  vec4 rays1 = vec4(iRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 36.2214, 21.11349, iSpeed);
  vec4 rays2 = vec4(iRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.3991, 18.0234, iSpeed * 0.2);
  vec4 color = rays1 * (1.0 - iBlend) * 0.9 + rays2 * iBlend * 0.9;
  float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / iResolution.y;
  float brightness = iIntensity * 0.4 / pow(max(distanceToLight, 0.001), iFalloff);
  color.rgb *= brightness;
  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(gray), color.rgb, iSaturation);
  color.a = max(color.r, max(color.g, color.b)) * iOpacity;
  gl_FragColor = vec4(color.rgb * color.a, color.a);
}`

const updateSize = () => {
  const container = containerRef.value
  const renderer = rendererRef.value
  const uniforms = uniformsRef.value
  if (!container || !renderer || !uniforms) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  renderer.setSize(container.clientWidth, container.clientHeight)
  uniforms.iResolution.value = [container.clientWidth * dpr, container.clientHeight * dpr]
}

const render = (time = 0) => {
  if (!visible.value || !rendererRef.value || !meshRef.value || !uniformsRef.value) return
  uniformsRef.value.iTime.value = time * .001
  rendererRef.value.render({ scene: meshRef.value })
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    animationFrame.value = requestAnimationFrame(render)
  }
}

const initialize = async () => {
  await nextTick()
  const container = containerRef.value
  if (!container) return
  const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, 2), alpha: true, premultipliedAlpha: true })
  rendererRef.value = renderer
  const canvas = renderer.gl.canvas as HTMLCanvasElement
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.display = 'block'
  container.replaceChildren(canvas)
  const uniforms: Uniforms = {
    iTime: { value: 0 },
    iResolution: { value: [1, 1] },
    iSpeed: { value: props.speed },
    iRayColor1: { value: rayColor1.value },
    iRayColor2: { value: rayColor2.value },
    iIntensity: { value: props.intensity },
    iSpread: { value: props.spread },
    iFlipX: { value: flip.value[0] },
    iFlipY: { value: flip.value[1] },
    iTilt: { value: props.tilt },
    iSaturation: { value: props.saturation },
    iBlend: { value: props.blend },
    iFalloff: { value: props.falloff },
    iOpacity: { value: props.opacity },
  }
  uniformsRef.value = uniforms
  const geometry = new Triangle(renderer.gl)
  const program = new Program(renderer.gl, { vertex: vertexShader, fragment: fragmentShader, uniforms })
  meshRef.value = new Mesh(renderer.gl, { geometry, program })
  resizeObserver = new ResizeObserver(updateSize)
  resizeObserver.observe(container)
  updateSize()
  render()
}

const cleanup = () => {
  if (animationFrame.value !== null) cancelAnimationFrame(animationFrame.value)
  animationFrame.value = null
  resizeObserver?.disconnect()
  resizeObserver = null
  const renderer = rendererRef.value
  if (renderer) renderer.gl.getExtension('WEBGL_lose_context')?.loseContext()
  containerRef.value?.replaceChildren()
  rendererRef.value = null
  meshRef.value = null
  uniformsRef.value = null
}

onMounted(() => {
  if (!containerRef.value) return
  intersectionObserver = new IntersectionObserver(([entry]) => { visible.value = entry.isIntersecting }, { threshold: .05 })
  intersectionObserver.observe(containerRef.value)
})

watch(visible, async (isVisible) => {
  if (isVisible && !rendererRef.value) await initialize()
  else if (isVisible && animationFrame.value === null) render(performance.now())
  if (!isVisible && animationFrame.value !== null) {
    cancelAnimationFrame(animationFrame.value)
    animationFrame.value = null
  }
})

watch(() => [props.speed, props.rayColor1, props.rayColor2, props.intensity, props.spread, props.origin, props.tilt, props.saturation, props.blend, props.falloff, props.opacity], () => {
  const uniforms = uniformsRef.value
  if (!uniforms) return
  uniforms.iSpeed.value = props.speed
  uniforms.iRayColor1.value = rayColor1.value
  uniforms.iRayColor2.value = rayColor2.value
  uniforms.iIntensity.value = props.intensity
  uniforms.iSpread.value = props.spread
  uniforms.iFlipX.value = flip.value[0]
  uniforms.iFlipY.value = flip.value[1]
  uniforms.iTilt.value = props.tilt
  uniforms.iSaturation.value = props.saturation
  uniforms.iBlend.value = props.blend
  uniforms.iFalloff.value = props.falloff
  uniforms.iOpacity.value = props.opacity
})

onUnmounted(() => {
  intersectionObserver?.disconnect()
  cleanup()
})
</script>

<style scoped>
.side-rays { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
</style>
