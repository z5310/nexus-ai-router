<script setup lang="ts">
import AConfigProvider from 'ant-design-vue/es/config-provider'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { nexusAntTheme } from '@gateway/ui'
</script>

<template><AConfigProvider :theme="nexusAntTheme" :locale="zhCN" :auto-insert-space-in-button="false"><div class="nexus-ant-app"><RouterView /></div></AConfigProvider></template>
