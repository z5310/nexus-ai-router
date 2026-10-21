<script setup lang="ts">
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Database,
  ExternalLink,
  FileText,
  Globe2,
  Image,
  KeyRound,
  Menu,
  Moon,
  Route,
  Search,
  ShieldCheck,
  Sun,
  Terminal,
  Video,
  WalletCards,
  X,
} from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BrandLogo from '../../components/BrandLogo.vue'
import { setLocale, type SupportedLocale } from '../../i18n'

type DocsTheme = 'dark' | 'light'

const copied = ref(false)
const sideOpen = ref(false)
const storedTheme = localStorage.getItem('nexus-docs-theme')
const theme = ref<DocsTheme>(
  storedTheme === 'light' || storedTheme === 'dark'
    ? storedTheme
    : 'dark',
)
const { t, locale } = useI18n()

watch(theme, (value) => localStorage.setItem('nexus-docs-theme', value), { immediate: true })

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

const toggleLocale = () => {
  setLocale((locale.value === 'zh-CN' ? 'en-US' : 'zh-CN') as SupportedLocale)
}

const copyCode = async () => {
  await navigator.clipboard?.writeText('npm install openai')
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1200)
}
</script>

<template>
  <div :class="['docs-page', `docs-page--${theme}`]">
    <div class="docs-aurora" aria-hidden="true" />

    <header class="docs-header">
      <RouterLink class="docs-brand" to="/">
        <BrandLogo />
      </RouterLink>

      <label class="docs-search">
        <Search :size="16" />
        <input :placeholder="t('docs.search')">
        <kbd>⌘ K</kbd>
      </label>

      <nav class="docs-top-nav" :aria-label="t('common.mainNav')">
        <RouterLink to="/models">{{ t('common.models') }}</RouterLink>
      </nav>

      <div class="docs-header-actions">
        <a class="docs-console-link" href="/console" target="_blank" rel="noopener noreferrer">
          {{ t('docs.openConsole') }} <ExternalLink :size="13" />
        </a>
        <button
          class="docs-theme-toggle"
          :aria-label="theme === 'dark' ? t('docs.useLight') : t('docs.useDark')"
          @click="toggleTheme"
        >
          <span :class="{ active: theme === 'light' }"><Sun :size="14" /></span>
          <span :class="{ active: theme === 'dark' }"><Moon :size="14" /></span>
        </button>
        <button class="docs-language" :aria-label="t('language.label')" @click="toggleLocale">
          <Globe2 :size="16" />
          <span>{{ locale === 'zh-CN' ? '中' : 'EN' }}</span>
        </button>
      </div>

      <button class="docs-menu" :aria-label="t('common.openNav')" @click="sideOpen = !sideOpen">
        <X v-if="sideOpen" :size="19" />
        <Menu v-else :size="19" />
      </button>
    </header>

    <button v-if="sideOpen" class="docs-overlay" aria-label="Close" @click="sideOpen = false" />

    <div class="docs-layout">
      <aside :class="['docs-sidebar', { open: sideOpen }]">
        <nav>
          <section>
            <div class="docs-nav-heading">
              <span>{{ t('docs.start') }}</span>
              <ChevronDown :size="14" />
            </div>
            <a class="active" href="#quickstart" @click="sideOpen = false"><BookOpen :size="16" /> {{ t('docs.quickstart') }}</a>
            <a href="#"><KeyRound :size="16" /> {{ t('docs.apiKeys') }}</a>
            <a href="#install"><Code2 :size="16" /> {{ t('docs.sdk') }}</a>
          </section>

          <section>
            <div class="docs-nav-heading">
              <span>{{ t('docs.core') }}</span>
              <ChevronDown :size="14" />
            </div>
            <a href="#"><FileText :size="16" /> {{ t('docs.text') }}</a>
            <a href="#"><Image :size="16" /> {{ t('docs.image') }}</a>
            <a href="#"><Video :size="16" /> {{ t('docs.video') }}</a>
            <a href="#"><Route :size="16" /> {{ t('docs.routing') }}</a>
          </section>

          <section>
            <div class="docs-nav-heading">
              <span>{{ t('docs.platform') }}</span>
              <ChevronDown :size="14" />
            </div>
            <a href="#"><Boxes :size="16" /> {{ t('docs.pricing') }}</a>
            <a href="#"><WalletCards :size="16" /> {{ t('docs.billing') }}</a>
            <a href="#"><Database :size="16" /> {{ t('docs.errors') }}</a>
            <a href="#"><ShieldCheck :size="16" /> {{ t('docs.security') }}</a>
          </section>
        </nav>

        <div class="docs-help">
          <div><span class="docs-status-dot" /> {{ t('docs.help') }}</div>
          <p>{{ t('docs.helpDesc') }}</p>
          <a href="#">{{ t('docs.support') }} <ArrowRight :size="13" /></a>
        </div>
      </aside>

      <main class="docs-content">
        <div class="docs-breadcrumb">
          {{ t('docs.breadcrumb') }} <ChevronRight :size="13" /> {{ t('docs.start') }}
          <ChevronRight :size="13" /> <b>{{ t('docs.quickstart') }}</b>
        </div>

        <article id="quickstart">
          <div class="docs-tag">QUICKSTART</div>
          <h1>{{ t('docs.quickstart') }}</h1>
          <p class="docs-lead">{{ t('docs.lead') }}</p>

          <div class="docs-callout">
            <span><Check :size="17" /></span>
            <div>
              <b>{{ t('docs.compatible') }}</b>
              <p>{{ t('docs.compatibleDesc') }}</p>
            </div>
          </div>

          <section id="install" class="docs-article-section">
            <h2><span>1</span> {{ t('docs.install') }}</h2>
            <p>{{ t('docs.installDesc') }}</p>
            <div class="code-block">
              <div>
                <span><Terminal :size="14" /> Terminal</span>
                <button @click="copyCode">
                  <Check v-if="copied" :size="14" />
                  <Copy v-else :size="14" />
                  {{ copied ? t('docs.copied') : t('docs.copy') }}
                </button>
              </div>
              <pre><code>npm install openai</code></pre>
            </div>
          </section>

          <section id="configure" class="docs-article-section">
            <h2><span>2</span> {{ t('docs.configure') }}</h2>
            <p>{{ t('docs.configureDesc') }}</p>
            <div class="code-block large">
              <div>
                <span><Code2 :size="14" /> TypeScript</span>
                <button><Copy :size="14" />{{ t('docs.copy') }}</button>
              </div>
              <pre><code><em>import</em> OpenAI <em>from</em> <strong>'openai'</strong>

<em>const</em> client = <em>new</em> OpenAI({
  apiKey: process.env.<b>NEXUS_API_KEY</b>,
  baseURL: <strong>'https://api.nexus.cn/v1'</strong>,
})

<em>const</em> response = <em>await</em> client.chat.completions.create({
  model: <strong>'nexus/auto'</strong>,
  messages: [{ role: <strong>'user'</strong>, content: <strong>'{{ t('docs.samplePrompt') }}'</strong> }],
})</code></pre>
            </div>
          </section>

          <a class="docs-next-step" href="#">
            <span><small>{{ t('docs.next') }}</small><b>{{ t('docs.send') }}</b></span>
            <ArrowRight :size="19" />
          </a>
        </article>
      </main>

      <aside class="docs-toc">
        <span>{{ t('docs.toc') }}</span>
        <a class="active" href="#quickstart">{{ t('docs.quickstart') }}</a>
        <a href="#install">{{ t('docs.install') }}</a>
        <a href="#configure">{{ t('docs.configure') }}</a>
        <a href="#">{{ t('docs.send') }}</a>
        <a href="#">{{ t('docs.rateLimits') }}</a>
      </aside>
    </div>
  </div>
</template>
