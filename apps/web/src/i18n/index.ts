import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

export const languages = [
  { code: 'zh-CN', labelKey: 'language.zhCN', shortLabel: '中文' },
  { code: 'en-US', labelKey: 'language.enUS', shortLabel: 'EN' },
] as const

export type SupportedLocale = typeof languages[number]['code']

const savedLocale = localStorage.getItem('nexus-locale')
const initialLocale: SupportedLocale = languages.some(({ code }) => code === savedLocale)
  ? savedLocale as SupportedLocale
  : navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'zh-CN',
  messages: { 'zh-CN': zhCN, 'en-US': enUS },
})

export const setLocale = (locale: SupportedLocale) => {
  i18n.global.locale.value = locale
  localStorage.setItem('nexus-locale', locale)
  document.documentElement.lang = locale
}

document.documentElement.lang = initialLocale
