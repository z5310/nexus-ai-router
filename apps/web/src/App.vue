<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const route = useRoute()
const { t, locale } = useI18n()

watch([() => route.meta.titleKey, locale], ([titleKey]) => {
  document.title = titleKey ? t(String(titleKey)) : 'Nexus API'
}, { immediate: true })
</script>

<template><RouterView /></template>
