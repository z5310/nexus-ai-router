<script setup lang="ts">
import { Network, Zap } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import ModelLogo from './ModelLogo.vue'

const { t } = useI18n()

const providers = [
  { key: 'openai', owner: 'openai', provider: 'OpenAI', name: 'GPT-6.1 Sol', accent: '#d8e8dd', position: 'primary' },
  { key: 'claude', owner: 'anthropic', provider: 'Anthropic', name: 'Claude', accent: '#d97757', position: 'top' },
  { key: 'deepseek', owner: 'deepseek', provider: 'DeepSeek', name: 'DeepSeek', accent: '#5b79ff', position: 'bottom' },
] as const
</script>

<template>
  <div class="routing-visual" role="img" :aria-label="t('catalog.routingVisualLabel')">
    <div class="routing-visual__aurora" />
    <div class="routing-visual__grid" />

    <div class="routing-visual__topbar">
      <span><i />{{ t('catalog.routingLive') }}</span>
    </div>

    <div class="routing-map">
      <svg class="routing-lines" viewBox="0 0 620 210" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="route-active" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#63e495" stop-opacity=".08" />
            <stop offset=".48" stop-color="#63e495" stop-opacity=".95" />
            <stop offset="1" stop-color="#b8f5cd" stop-opacity=".58" />
          </linearGradient>
          <linearGradient id="route-idle" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#63e495" stop-opacity=".04" />
            <stop offset="1" stop-color="#63e495" stop-opacity=".26" />
          </linearGradient>
          <filter id="route-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path class="route route--idle" d="M250 108 C340 108 350 42 452 42" />
        <path class="route route--active" d="M250 108 C342 108 360 91 470 91" />
        <path class="route route--idle route--delay-one" d="M250 108 C340 108 350 172 452 172" />
        <circle class="route-pulse" cx="365" cy="101" r="3.2" />
      </svg>

      <div class="request-chip"><Zap :size="13" /><span>{{ t('catalog.requestIn') }}</span></div>

      <div class="router-core">
        <span class="router-core__orbit" />
        <span class="router-core__icon"><Network :size="23" /></span>
        <strong>Nexus</strong>
        <small>{{ t('catalog.routerCore') }}</small>
      </div>

      <div
        v-for="provider in providers"
        :key="provider.key"
        :class="['provider-node', `provider-node--${provider.position}`]"
      >
        <ModelLogo
          :owner="provider.owner"
          :provider="provider.provider"
          :name="provider.name"
          :accent="provider.accent"
          :size="provider.position === 'primary' ? 38 : 30"
        />
        <span><strong>{{ provider.name }}</strong><small>{{ provider.position === 'primary' ? t('catalog.selectedRoute') : provider.provider }}</small></span>
        <i v-if="provider.position === 'primary'" />
      </div>
    </div>

  </div>
</template>

<style scoped>
.routing-visual {
  position: relative;
  min-height: 260px;
  overflow: hidden;
  isolation: isolate;
  color: #dff2e5;
  background:
    radial-gradient(circle at 64% 46%,rgba(73,222,126,.12),transparent 30%),
    linear-gradient(90deg,transparent 0%,rgba(9,21,15,.18) 28%,rgba(10,29,19,.72) 72%,rgba(12,33,23,.9) 100%);
}
.routing-visual__aurora { position: absolute; z-index: 0; inset: -50% 15% -50% 28%; border-radius: 50%; background: radial-gradient(ellipse,rgba(77,222,128,.13),transparent 64%); filter: blur(18px); animation: visual-breathe 6s ease-in-out infinite; }
.routing-visual__grid {
  position: absolute;
  z-index: 0;
  top: 28%;
  right: -18%;
  bottom: -58%;
  left: -18%;
  opacity: .44;
  background-image:
    linear-gradient(rgba(102, 229, 148, .2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(102, 229, 148, .18) 1px, transparent 1px);
  background-size: 35px 35px;
  filter: drop-shadow(0 0 5px rgba(57, 200, 108, .08));
  transform: perspective(430px) rotateX(62deg) scale(1.18);
  transform-origin: 50% 0;
  mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,.48) 16%, #000 34%, #000 66%, rgba(0,0,0,.48) 84%, transparent 100%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,.48) 16%, #000 34%, #000 66%, rgba(0,0,0,.48) 84%, transparent 100%);
}
.routing-visual__grid::before {
  content: '';
  position: absolute;
  inset: 0;
  background: inherit;
  background-size: inherit;
  opacity: .72;
  filter: blur(4px);
  mask-image: linear-gradient(90deg, #000 0%, transparent 27%, transparent 73%, #000 100%);
  -webkit-mask-image: linear-gradient(90deg, #000 0%, transparent 27%, transparent 73%, #000 100%);
}
.routing-visual__grid::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(6, 18, 12, .94) 0%, transparent 24%, transparent 74%, rgba(7, 20, 13, .72) 100%);
}
.routing-visual__topbar { position: absolute; z-index: 6; top: 20px; right: 22px; left: 24px; display: flex; align-items: center; justify-content: space-between; color: #799087; font-size: 9px; letter-spacing: .03em; }
.routing-visual__topbar span { display: flex; align-items: center; gap: 7px; }
.routing-visual__topbar span i { width: 6px; height: 6px; border-radius: 50%; background: var(--green); box-shadow: 0 0 12px rgba(99,228,149,.75); }
.routing-map { position: absolute; z-index: 2; inset: 42px 0 18px; }
.routing-lines { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.route { fill: none; stroke-width: 1.25; stroke-linecap: round; stroke-dasharray: 5 7; animation: route-flow 2.2s linear infinite; }
.route--active { stroke: url(#route-active); stroke-width: 1.8; filter: url(#route-glow); }
.route--idle { stroke: url(#route-idle); }.route--delay-one { animation-delay: -.7s; }.route--delay-two { animation-delay: -1.35s; }
.route-pulse { fill: #b8f5cd; filter: drop-shadow(0 0 7px #63e495); animation: route-pulse 1.7s ease-in-out infinite; }
.request-chip { position: absolute; top: 50%; left: 5%; display: flex; align-items: center; gap: 6px; padding: 7px 9px; color: #83bd96; border: 1px solid rgba(99,228,149,.14); border-radius: 9px; background: rgba(9,21,15,.82); box-shadow: 0 8px 20px rgba(0,0,0,.18); font-size: 8px; transform: translateY(-50%); }
.request-chip::after { content: ""; width: 34px; height: 1px; position: absolute; left: 100%; top: 50%; background: linear-gradient(90deg,rgba(99,228,149,.55),transparent); }
.router-core { position: absolute; z-index: 3; top: 50%; left: 29%; width: 104px; height: 104px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid rgba(128,242,168,.22); border-radius: 50%; background: radial-gradient(circle at 40% 35%,#193828,#0c1d14 68%); box-shadow: inset 0 0 25px rgba(99,228,149,.1),0 0 42px rgba(31,156,76,.12); transform: translate(-50%,-50%); }
.router-core__orbit { position: absolute; inset: -9px; border: 1px dashed rgba(99,228,149,.18); border-radius: inherit; animation: orbit-spin 14s linear infinite; }
.router-core__orbit::before { content: ""; position: absolute; top: 8px; left: 15px; width: 6px; height: 6px; border-radius: 50%; background: var(--green); box-shadow: 0 0 12px rgba(99,228,149,.85); }
.router-core__icon { width: 35px; height: 35px; display: grid; place-items: center; margin-bottom: 5px; color: var(--green); border-radius: 10px; background: rgba(99,228,149,.09); }
.router-core strong { font-size: 11px; letter-spacing: -.02em; }.router-core small { margin-top: 2px; color: #667970; font-size: 7px; }
.provider-node { position: absolute; z-index: 4; display: flex; align-items: center; gap: 8px; min-width: 118px; padding: 7px 9px; border: 1px solid rgba(222,255,233,.085); border-radius: 11px; background: rgba(9,20,14,.84); box-shadow: 0 9px 26px rgba(0,0,0,.2); backdrop-filter: blur(10px); }
.provider-node > span { min-width: 0; }.provider-node strong,.provider-node small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.provider-node strong { color: #c5d5ca; font-size: 9px; }.provider-node small { margin-top: 3px; color: #5e7066; font-size: 7px; }
.provider-node--primary { top: 50%; right: 7%; min-width: 146px; padding: 9px 11px; border-color: rgba(99,228,149,.26); background: linear-gradient(105deg,rgba(14,34,23,.96),rgba(11,26,18,.92)); box-shadow: 0 10px 32px rgba(0,0,0,.24),inset 0 0 22px rgba(99,228,149,.035); transform: translateY(-50%); }
.provider-node--primary strong { color: #edf8f0; font-size: 10px; }.provider-node--primary small { color: #79c992; }.provider-node--primary > i { width: 7px; height: 7px; margin-left: auto; border: 2px solid #0d2117; border-radius: 50%; background: var(--green); box-shadow: 0 0 0 2px rgba(99,228,149,.14),0 0 10px rgba(99,228,149,.8); }
.provider-node--top { top: 2px; right: 13%; }.provider-node--bottom { right: 10%; bottom: 0; }
.provider-node--top,.provider-node--bottom { opacity: .72; transform: scale(.9); transform-origin: right center; }

@keyframes route-flow { to { stroke-dashoffset: -24; } }
@keyframes route-pulse { 0%,100% { opacity: .28; transform: scale(.7); transform-origin: center; } 50% { opacity: 1; transform: scale(1.35); transform-origin: center; } }
@keyframes orbit-spin { to { transform: rotate(360deg); } }
@keyframes visual-breathe { 0%,100% { opacity: .65; transform: scale(.94); } 50% { opacity: 1; transform: scale(1.08); } }

@media (max-width: 760px) {
  .routing-visual { min-height: 210px; }
  .routing-map { inset: 38px 0 14px; transform: scale(.88); transform-origin: center; }
  .routing-visual__topbar { top: 14px; right: 15px; left: 15px; }
}

@media (max-width: 460px) {
  .request-chip { left: 1%; }
  .router-core { left: 26%; width: 88px; height: 88px; }
  .provider-node--primary { right: 2%; min-width: 132px; }
  .provider-node--top { right: 7%; }.provider-node--bottom { right: 1%; }
}

@media (prefers-reduced-motion: reduce) {
  .route,.route-pulse,.router-core__orbit,.routing-visual__aurora { animation: none; }
}
</style>
