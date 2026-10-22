<script setup lang="ts">
import { ChevronDown, LogOut, Settings, ShieldCheck } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { authState, signOut } from '../../../lib/auth'

const { t } = useI18n()
const router = useRouter()
const root = ref<HTMLElement | null>(null)
const open = ref(false)
const signingOut = ref(false)

const initials = computed(() => {
  const source = authState.user?.name.trim() || authState.user?.email.split('@')[0] || 'U'
  return source.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
})
const roleLabel = computed(() => {
  const role = authState.user?.role ?? 'viewer'
  return t(`dashboard.role${role.charAt(0).toUpperCase()}${role.slice(1)}`)
})

function close() { open.value = false }
function onPointerDown(event: PointerEvent) { if (!root.value?.contains(event.target as Node)) close() }
function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') close() }
async function handleSignOut() {
  if (signingOut.value) return
  signingOut.value = true
  try { await signOut(); close(); await router.replace('/login') } finally { signingOut.value = false }
}

onMounted(() => { document.addEventListener('pointerdown', onPointerDown); document.addEventListener('keydown', onKeyDown) })
onBeforeUnmount(() => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown) })
</script>

<template>
  <div ref="root" class="user-menu">
    <button class="user-menu-trigger" type="button" :aria-label="t('dashboard.accountMenu')" aria-haspopup="menu" :aria-expanded="open" @click="open = !open">
      <span class="user-avatar">{{ initials }}</span><ChevronDown :size="14" :class="{ rotated: open }" />
    </button>
    <Transition name="account-menu">
      <div v-if="open" class="user-menu-panel" role="menu">
        <div class="user-menu-identity">
          <span class="user-menu-avatar">{{ initials }}</span>
          <div><strong>{{ authState.user?.name || t('dashboard.account') }}</strong><small>{{ authState.user?.email }}</small></div>
        </div>
        <span class="user-role"><ShieldCheck :size="13" /> {{ roleLabel }}</span>
        <div class="user-menu-divider" />
        <RouterLink to="/console/settings" role="menuitem" @click="close">
          <Settings :size="16" /><span><b>{{ t('dashboard.accountSettings') }}</b><small>{{ t('dashboard.accountSettingsHint') }}</small></span>
        </RouterLink>
        <button class="user-menu-logout" type="button" role="menuitem" :disabled="signingOut" @click="handleSignOut">
          <LogOut :size="16" /><span>{{ signingOut ? t('dashboard.signingOut') : t('dashboard.signOut') }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.user-menu { position: relative; }
.user-menu-trigger { display: flex; align-items: center; gap: 5px; padding: 3px 4px 3px 3px; color: #7e8c82; border: 1px solid transparent; border-radius: 11px; background: transparent; transition: border-color .18s ease, background .18s ease, color .18s ease; }
.user-menu-trigger:hover,.user-menu-trigger[aria-expanded="true"] { color: #cce6d5; border-color: rgba(99,228,149,.16); background: rgba(99,228,149,.06); }
.user-menu-trigger:focus-visible { outline: 2px solid rgba(99,228,149,.65); outline-offset: 2px; }
.user-menu-trigger svg { transition: transform .18s ease; }.user-menu-trigger svg.rotated { transform: rotate(180deg); }
.user-menu-panel { position: absolute; z-index: 100; top: calc(100% + 10px); right: 0; width: 260px; padding: 10px; color: #ffffff; border: 1px solid rgba(112,237,159,.16); border-radius: 15px; background: rgba(12,23,16,.94); box-shadow: 0 18px 48px rgba(0,0,0,.34); backdrop-filter: blur(22px) saturate(120%); }
.user-menu-identity { display: flex; align-items: center; gap: 10px; padding: 5px 5px 9px; }.user-menu-avatar { width: 38px; height: 38px; flex: 0 0 auto; display: grid; place-items: center; color: #082010; border-radius: 10px; background: linear-gradient(145deg,#c8f8d8,#75dda0); font-size: 12px; font-weight: 800; }
.user-menu-identity > div { min-width: 0; display: flex; flex-direction: column; gap: 3px; }.user-menu-identity strong,.user-menu-identity small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.user-menu-identity strong { font-size: 12px; }.user-menu-identity small { color: #738178; font-size: 9px; }
.user-role { width: fit-content; display: flex; align-items: center; gap: 5px; margin: 0 5px 8px 53px; padding: 4px 7px; color: #8de9ae; border: 1px solid rgba(99,228,149,.12); border-radius: 999px; background: rgba(99,228,149,.06); font-size: 8px; }.user-menu-divider { height: 1px; margin: 2px 0 7px; background: rgba(255,255,255,.07); }
.user-menu-panel a,.user-menu-logout { width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 10px; color: #b5c2b9; border: 0; border-radius: 9px; background: transparent; text-align: left; transition: color .18s ease, background .18s ease; }.user-menu-panel a:hover,.user-menu-panel a:focus-visible { color: #eaf5ed; outline: 0; background: rgba(255,255,255,.045); }
.user-menu-panel a > span { min-width: 0; display: flex; flex-direction: column; gap: 2px; }.user-menu-panel a b { font-size: 10px; font-weight: 650; }.user-menu-panel a small { color: #657269; font-size: 8px; }
.user-menu-logout { margin-top: 3px; color: #e19b9b; font-size: 10px; cursor: pointer; }.user-menu-logout:hover,.user-menu-logout:focus-visible { color: #ffb2b2; outline: 0; background: rgba(235,105,105,.075); }.user-menu-logout:disabled { cursor: wait; opacity: .55; }
.account-menu-enter-active,.account-menu-leave-active { transition: opacity .16s ease, transform .16s ease; transform-origin: top right; }.account-menu-enter-from,.account-menu-leave-to { opacity: 0; transform: translateY(-5px) scale(.98); }
@media (max-width: 600px) { .user-menu-panel { right: -4px; width: min(260px,calc(100vw - 24px)); } }
</style>
