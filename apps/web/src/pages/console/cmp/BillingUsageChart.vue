<script setup lang="ts">
import type { BillingUsageReport } from '@gateway/contracts'
import { BarChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { init, use, type ECharts, type EChartsCoreOption } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

use([BarChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{ report: BillingUsageReport }>()
const root = ref<HTMLDivElement>()
let chart: ECharts | undefined
let observer: ResizeObserver | undefined
const colors = ['#58e899', '#4ca6ff', '#a780ff', '#f6bf5b', '#f57d95', '#47d6c7', '#e58cff']

function labels() {
  const step = props.report.period.bucket === 'hour' ? 3_600_000 : 86_400_000
  const values: string[] = []
  for (let time = new Date(props.report.period.from).getTime(); time < new Date(props.report.period.to).getTime(); time += step) values.push(new Date(time).toISOString())
  return values
}

function render() {
  if (!root.value) return
  chart ??= init(root.value, undefined, { renderer: 'canvas' })
  const buckets = labels()
  const points = new Map(props.report.timeline.map((point) => [point.start, point]))
  const option: EChartsCoreOption = {
    animationDuration: 350,
    color: colors,
    grid: { left: 10, right: 12, top: 56, bottom: 4, containLabel: true },
    legend: { type: 'scroll', top: 0, left: 0, right: 0, textStyle: { color: '#b9c9bf', fontSize: 11 }, pageTextStyle: { color: '#b9c9bf' } },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#102019', borderColor: '#2b4939', borderWidth: 1, textStyle: { color: '#f4fff8' },
      valueFormatter: (value: unknown) => `¥ ${Number(value).toFixed(6)}`,
    },
    xAxis: {
      type: 'category', data: buckets,
      axisLabel: { color: '#82958b', formatter: (value: string) => props.report.period.bucket === 'hour' ? new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : new Date(value).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) },
      axisLine: { lineStyle: { color: '#294137' } }, axisTick: { show: false },
    },
    yAxis: {
      type: 'value', minInterval: 0.000001,
      axisLabel: { color: '#82958b', formatter: (value: number) => value === 0 ? '¥0' : `¥${value.toFixed(value < 0.001 ? 6 : value < 0.01 ? 4 : 2)}` },
      splitLine: { lineStyle: { color: 'rgba(148, 184, 165, .12)' } },
    },
    series: props.report.models.map((model) => ({
      name: model.name, type: 'bar', stack: 'spend', barMaxWidth: 34,
      emphasis: { focus: 'series' },
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      data: buckets.map((start) => Number(points.get(start)?.models.find((item) => item.modelId === model.id)?.spent ?? 0)),
    })),
  }
  chart.setOption(option, true)
}

onMounted(() => {
  void nextTick(render)
  if (root.value) {
    observer = new ResizeObserver(() => chart?.resize())
    observer.observe(root.value)
  }
})
watch(() => props.report, () => void nextTick(render), { deep: true })
onBeforeUnmount(() => { observer?.disconnect(); chart?.dispose() })
</script>

<template>
  <div class="relative min-h-[310px]">
    <div ref="root" class="h-[310px] w-full" role="img" aria-label="按时间和模型展示的已结算消费金额柱状图" />
    <div v-if="!report.models.length" class="pointer-events-none absolute inset-0 flex items-center justify-center text-[#82958b]">所选时段暂无已结算消费</div>
  </div>
</template>
