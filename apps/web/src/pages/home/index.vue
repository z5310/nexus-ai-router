<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { motion } from 'motion-v'
import { ArrowRight, ArrowUpRight, CircleDollarSign, Gauge, Route, Search, ShieldCheck, Zap } from 'lucide-vue-next'
import BorderGlow from './cmp/BorderGlow.vue'
import DotField from './cmp/DotField.vue'
import MoltenMetal from './cmp/MoltenMetal.vue'
import SideRays from './cmp/SideRays.vue'
import LogoLoop from './cmp/LogoLoop.vue'
import ModelLogo from '../../components/ModelLogo.vue'
import SiteHeader from '../../components/SiteHeader.vue'
import StarBorder from './cmp/StarBorder.vue'

const { t } = useI18n()
const codeSample = `curl https://api.nexus.cn/v1/chat/completions \\
  -H "Authorization: Bearer $NEXUS_KEY" \\
  -d '{ "model": "nexus/auto", "messages": [...] }'`
const typedCode = ref('')
let typingTimer: number | undefined

const startTyping = () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    typedCode.value = codeSample
    return
  }

  let index = 0
  const typeNext = () => {
    typedCode.value = codeSample.slice(0, index)
    if (index < codeSample.length) {
      const nextCharacter = codeSample[index]
      index += 1
      typingTimer = window.setTimeout(typeNext, nextCharacter === '\n' ? 180 : 18 + Math.random() * 24)
      return
    }

    typingTimer = window.setTimeout(() => {
      index = 0
      typedCode.value = ''
      typingTimer = window.setTimeout(typeNext, 360)
    }, 2200)
  }

  typeNext()
}

onMounted(startTyping)
onBeforeUnmount(() => window.clearTimeout(typingTimer))
const features = computed(() => [
  { icon: Route, title: t('home.feature1'), text: t('home.feature1Desc'), stat: '99.99%', label: t('home.availability') },
  { icon: Gauge, title: t('home.feature2'), text: t('home.feature2Desc'), stat: '< 30s', label: t('home.refresh') },
  { icon: ShieldCheck, title: t('home.feature3'), text: t('home.feature3Desc'), stat: 'AES-256', label: t('home.encryption') },
  { icon: CircleDollarSign, title: t('home.feature4'), text: t('home.feature4Desc'), stat: '100%', label: t('home.traceable') },
])

const deals = [
  { name: 'GPT-6.1 Sol', owner: 'openai', provider: 'OpenAI', color: '#d4e2d8', saving: '31%', input: '¥8.40', oldInput: '¥12.00', output: '¥42.00', oldOutput: '¥60.00' },
  { name: 'Claude Sonnet 5.5', owner: 'anthropic', provider: 'Anthropic', color: '#e7a27a', saving: '18%', input: '¥21.00', oldInput: '¥25.60', output: '¥105.00', oldOutput: '¥128.00' },
  { name: 'DeepSeek V4.1 Flash', owner: 'deepseek', provider: 'DeepSeek', color: '#8b9cff', saving: '40%', input: '¥1.80', oldInput: '¥3.00', output: '¥7.20', oldOutput: '¥12.00' },
  { name: 'Qwen 3.8 Max', owner: 'alibaba', provider: 'Qwen', color: '#a991ff', saving: '35%', input: '¥4.20', oldInput: '¥6.46', output: '¥16.80', oldOutput: '¥25.85' },
  { name: 'Gemini 3 Flash', owner: 'google', provider: 'Google', color: '#72c7ff', saving: '49%', input: '¥0.70', oldInput: '¥1.37', output: '¥3.50', oldOutput: '¥6.86' },
  { name: 'MiniMax M2.5', owner: 'minimax', provider: 'MiniMax', color: '#65e2a2', saving: '26%', input: '¥2.60', oldInput: '¥3.51', output: '¥10.40', oldOutput: '¥14.05' },
]

const dealSearch = ref('')
const filteredDeals = computed(() => {
  const keyword = dealSearch.value.trim().toLowerCase()
  if (!keyword) return deals
  return deals.filter((deal) => `${deal.provider} ${deal.name}`.toLowerCase().includes(keyword))
})
</script>

<template>
  <div class="marketing-page">
    <SiteHeader />
    <main>
      <section class="hero-section">
        <div class="hero-dot-field" aria-hidden="true">
          <DotField
            :dot-radius="1.5"
            :dot-spacing="14"
            :bulge-strength="67"
            :glow-radius="160"
            :sparkle="false"
            :wave-amplitude="0"
            :cursor-radius="500"
            :cursor-force="0.1"
            bulge-only
            gradient-from="#7cff67"
            gradient-to="#a0ffbc"
            glow-color="#120f17"
          />
        </div>
        <div class="hero-rays-layer">
          <SideRays
            :speed="2.5"
            ray-color1="#27ff64"
            ray-color2="#a8ffb6"
            :intensity="2"
            :spread="2"
            origin="top-right"
            :tilt="0"
            :saturation="1.5"
            :blend="0.75"
            :falloff="1.6"
            :opacity="1"
          />
        </div>
        <div class="hero-shade" />
        <motion.div class="hero-content" :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: .72 }">
          <div class="eyebrow"><b>NEW</b><span>{{ t('home.badge') }}</span></div>
          <h1>{{ t('home.title1') }}<br /><em>{{ t('home.title2') }}</em></h1>
          <p>{{ t('home.subtitle') }}</p>
          <motion.div class="hero-code-block" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: .55, delay: .16 }">
            <div class="hero-code-top"><span><i /><i /><i /></span><code>POST /v1/chat/completions</code><b><i /> 200 OK</b></div>
            <pre :aria-label="codeSample"><code aria-hidden="true">{{ typedCode }}<i class="typing-caret" /></code></pre>
          </motion.div>
          <div class="hero-actions">
            <a class="button button-light" href="/console" target="_blank" rel="noopener noreferrer">{{ t('home.start') }}</a>
            <a class="button button-dark" href="/docs" target="_blank" rel="noopener noreferrer">{{ t('home.viewDocs') }}</a>
          </div>
        </motion.div>
      </section>

      <section v-reveal class="deals-section" :aria-label="t('home.deals')">
        <div class="deals-heading">
          <div><i /><b>{{ t('home.deals') }}</b><span>61</span></div>
          <div class="deals-actions"><label><Search :size="16" /><input v-model="dealSearch" :placeholder="t('home.searchModel')" /></label><RouterLink to="/models">{{ t('home.viewAll') }} <ArrowRight :size="15" /></RouterLink></div>
        </div>
        <div class="deals-grid-bg">
          <LogoLoop v-if="filteredDeals.length" :logos="filteredDeals" :speed="34" direction="left" :gap="18" :pause-on-hover="true" :fade-out="true" fade-out-color="#08130e" :aria-label="`${t('home.deals')} 1`">
            <template #renderItem="{ item }">
              <article class="deal-card">
                <div class="deal-card-top"><ModelLogo :owner="item.owner" :provider="item.provider" :name="item.name" :accent="item.color" :size="42" /><div><small>{{ item.provider }}</small><h3>{{ item.name }}</h3></div><b>{{ t('home.save') }} {{ item.saving }}</b></div>
                <div class="deal-prices"><span><small>{{ t('home.input') }}</small><strong>{{ item.input }}</strong><del>{{ item.oldInput }}</del></span><span><small>{{ t('home.output') }}</small><strong>{{ item.output }}</strong><del>{{ item.oldOutput }}</del></span></div>
                <footer><span>{{ t('home.perMillion') }}</span><RouterLink to="/models">{{ t('home.viewModel') }} <ArrowRight :size="14" /></RouterLink></footer>
              </article>
            </template>
          </LogoLoop>
          <LogoLoop v-if="filteredDeals.length" :logos="filteredDeals.slice().reverse()" :speed="28" direction="right" :gap="18" :pause-on-hover="true" :fade-out="true" fade-out-color="#08130e" :aria-label="`${t('home.deals')} 2`">
            <template #renderItem="{ item }">
              <article class="deal-card">
                <div class="deal-card-top"><ModelLogo :owner="item.owner" :provider="item.provider" :name="item.name" :accent="item.color" :size="42" /><div><small>{{ item.provider }}</small><h3>{{ item.name }}</h3></div><b>{{ t('home.save') }} {{ item.saving }}</b></div>
                <div class="deal-prices"><span><small>{{ t('home.input') }}</small><strong>{{ item.input }}</strong><del>{{ item.oldInput }}</del></span><span><small>{{ t('home.output') }}</small><strong>{{ item.output }}</strong><del>{{ item.oldOutput }}</del></span></div>
                <footer><span>{{ t('home.perMillion') }}</span><RouterLink to="/models">{{ t('home.viewModel') }} <ArrowRight :size="14" /></RouterLink></footer>
              </article>
            </template>
          </LogoLoop>
          <div v-if="!filteredDeals.length" class="deals-empty">{{ t('home.noDeals') }}</div>
        </div>
      </section>

      <section class="content-section intro-section">
        <div class="section-kicker"><Zap :size="14" /> {{ t('home.production') }}</div>
        <div v-reveal class="split-heading"><h2>{{ t('home.simpleTitle1') }}<br />{{ t('home.simpleTitle2') }}</h2><p>{{ t('home.simpleDesc') }}</p></div>
        <div class="feature-grid">
          <BorderGlow
            v-for="(feature, index) in features"
            :key="feature.title"
            as="article"
            class="feature-panel"
            background-color="#111e17"
            :colors="['#63e495', '#b8f5cd', '#74d8c1']"
            glow-color="145 70 65"
            :glow-radius="24"
            :glow-intensity="0.38"
            :fill-opacity="0.035"
            :cone-spread="22"
            :sweep-delay="index * 110"
            v-reveal="{ delay: index * 75 }"
          >
            <div class="feature-top"><span><component :is="feature.icon" :size="19" /></span><small>{{ feature.label }}</small></div>
            <h3>{{ feature.title }}</h3><p>{{ feature.text }}</p><strong>{{ feature.stat }}</strong>
          </BorderGlow>
        </div>
      </section>

      <section v-reveal class="content-section model-preview">
        <div class="preview-copy">
          <span class="section-kicker">{{ t('home.marketplace') }}</span>
          <h2>{{ t('home.compare1') }}<br />{{ t('home.compare2') }}</h2>
          <p>{{ t('home.compareDesc') }}</p>
          <RouterLink class="text-link" to="/models">{{ t('home.browse') }} <ArrowRight :size="15" /></RouterLink>
        </div>
        <div class="model-stack">
          <article><ModelLogo owner="openai" provider="OpenAI" name="GPT-6.1 Sol" accent="#d8e8dd" :size="38" /><div><b>GPT-6.1 Sol</b><small>{{ t('home.rankTags.gpt') }}</small></div><strong>96.8</strong></article>
          <article><ModelLogo owner="anthropic" provider="Anthropic" name="Claude Sonnet 5.5" accent="#d97757" :size="38" /><div><b>Claude Sonnet 5.5</b><small>{{ t('home.rankTags.claude') }}</small></div><strong>95.9</strong></article>
          <article><ModelLogo owner="deepseek" provider="DeepSeek" name="DeepSeek V4.1 Flash" accent="#5b79ff" :size="38" /><div><b>DeepSeek V4.1 Flash</b><small>{{ t('home.rankTags.deepseek') }}</small></div><strong>92.6</strong></article>
          <RouterLink class="ranking-callout" to="/rankings"><span>{{ t('home.weeklyRank') }}</span><ArrowUpRight :size="18" /></RouterLink>
        </div>
      </section>

      <StarBorder
        v-reveal
        id="get-started"
        as="section"
        class-name="cta-section"
        color="#8fffb2"
        speed="5s"
        :thickness="1"
      >
        <div class="cta-metal-shell">
          <MoltenMetal
            color1="#00ffa9"
            color2="#0f9d6e"
            color3="#ffffff"
            :speed="0.35"
            :scale="4"
            :detail="3"
            :glow="1.6"
            :core-size="0.1"
            :swirl="1"
            :fold="-0.2"
            :black-point="0.05"
            :brightness="1.3"
            color-mode="molten"
            :grain="true"
            :grain-intensity="0.05"
            :mouse-interaction="false"
            :mouse-strength="0.3"
            :opacity="0.4"
          />
          <div class="cta-metal-shade" />
        </div>
        <div class="cta-content"><span>NEXUS / GET STARTED</span><h2>{{ t('home.ctaTitle') }}</h2><p>{{ t('home.ctaDesc') }}</p></div>
        <a class="button button-light" href="/console" target="_blank" rel="noopener noreferrer">{{ t('home.createAccount') }} <ArrowRight :size="16" /></a>
      </StarBorder>
    </main>
    <footer v-reveal class="site-footer"><div><b>Nexus API</b><span>{{ t('home.footerLine') }}</span></div><p>© 2026 Nexus API</p></footer>
  </div>
</template>
