<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import AConfigProvider from 'ant-design-vue/es/config-provider'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { nexusAntTheme } from '@gateway/ui'

const route = useRoute()
const { t, locale } = useI18n()

watch([() => route.meta.titleKey, locale], ([titleKey]) => {
  document.title = titleKey ? t(String(titleKey)) : 'Nexus API'
}, { immediate: true })
</script>

<template><AConfigProvider :theme="nexusAntTheme" :locale="zhCN" :auto-insert-space-in-button="false"><div class="nexus-ant-app"><RouterView /></div></AConfigProvider></template>
