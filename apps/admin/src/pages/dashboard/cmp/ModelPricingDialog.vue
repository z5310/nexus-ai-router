<script setup lang="ts">
import { useMutation, useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { BadgePercent, Clock3, X } from 'lucide-vue-next'
import AButton from 'ant-design-vue/es/button'
import AForm from 'ant-design-vue/es/form'
import AInputNumber from 'ant-design-vue/es/input-number'
import AModal from 'ant-design-vue/es/modal'
import ASelect, { SelectOption as ASelectOption } from 'ant-design-vue/es/select'
import type { AdminModel, UpdateModelPricingInput } from '../api'
import { getModelPricing, updateModelPricing } from '../api'

const props = defineProps<{ model: AdminModel }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const originalInputPrice = ref(props.model.originalInputPrice)
const originalOutputPrice = ref<number | undefined>(props.model.originalOutputPrice ?? undefined)
const discountPercent = ref(props.model.discountPercent)
const priceUnit = ref(props.model.priceUnit)
const query = useQuery({ queryKey: ['admin-model-pricing', props.model.id], queryFn: () => getModelPricing(props.model.id) })
const factor = computed(() => Math.max(0, 1 - Number(discountPercent.value || 0) / 100))
const inputPrice = computed(() => round(Number(originalInputPrice.value || 0) * factor.value))
const outputPrice = computed(() => originalOutputPrice.value === undefined ? null : round(Number(originalOutputPrice.value || 0) * factor.value))
const mutation = useMutation({
  mutationFn: (input: UpdateModelPricingInput) => updateModelPricing(props.model.id, input),
  onSuccess: () => emit('saved'),
})

function round(value: number) { return Math.round((value + Number.EPSILON) * 10_000) / 10_000 }
function money(value: number | null) { return value === null ? '—' : `¥${value.toFixed(value < 1 ? 4 : 2)}` }
function date(value: string) { return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function submit() {
  mutation.mutate({
    originalInputPrice: Number(originalInputPrice.value),
    originalOutputPrice: originalOutputPrice.value === undefined ? null : Number(originalOutputPrice.value),
    discountPercent: Number(discountPercent.value),
    priceUnit: priceUnit.value,
  })
}
</script>

<template>
  <AModal :open="true" :footer="null" :closable="false" :width="672" wrap-class-name="nexus-admin-modal" @cancel="emit('close')">
    <section class="max-h-[calc(100dvh-80px)] overflow-y-auto text-[#dce7de]">
        <header class="flex items-start justify-between border-b border-white/8 pb-5">
          <div class="flex gap-3">
            <span class="grid h-10 w-10 place-items-center rounded-3 bg-emerald/10 text-[#75e69d]"><BadgePercent :size="20" /></span>
            <div><h2 class="m-0 text-lg font-650">发布模型定价</h2><p class="mt-1 text-xs text-[#718078]">{{ model.name }} · {{ model.slug }}</p></div>
          </div>
          <AButton type="text" class="grid h-8 w-8 place-items-center p-0 text-[#87958c]" aria-label="关闭" @click="emit('close')"><X :size="17" /></AButton>
        </header>

        <AForm class="grid gap-5 py-6" @finish="submit">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label class="grid gap-2 text-xs text-[#96a39a]">输入原价
              <AInputNumber v-model:value="originalInputPrice" required :min="0" :max="99999999" :step="0.0001" class="h-11 w-full text-sm" />
            </label>
            <label class="grid gap-2 text-xs text-[#96a39a]">输出原价
              <AInputNumber v-model:value="originalOutputPrice" :min="0" :max="99999999" :step="0.0001" placeholder="无输出价格可留空" class="h-11 w-full text-sm" />
            </label>
            <label class="grid gap-2 text-xs text-[#96a39a]">折扣比例
              <AInputNumber v-model:value="discountPercent" required :min="0" :max="100" :step="0.01" class="h-11 w-full text-sm"><template #addonAfter>%</template></AInputNumber>
            </label>
            <label class="grid gap-2 text-xs text-[#96a39a]">计价单位
              <ASelect v-model:value="priceUnit" class="h-11 w-full text-sm"><ASelectOption value="million_tokens">每百万 Token</ASelectOption><ASelectOption value="image">每张图片</ASelectOption><ASelectOption value="second">每秒</ASelectOption><ASelectOption value="10k_chars">每万字符</ASelectOption></ASelect>
            </label>
          </div>

          <div class="grid grid-cols-2 gap-3 rounded-3 border border-[#63e495]/15 bg-[#63e495]/6 p-4">
            <div><small class="text-[#718078]">输入成交价</small><strong class="mt-1 block text-xl text-[#c5f6d4]">{{ money(inputPrice) }}</strong></div>
            <div><small class="text-[#718078]">输出成交价</small><strong class="mt-1 block text-xl text-[#c5f6d4]">{{ money(outputPrice) }}</strong></div>
            <p class="col-span-2 m-0 text-xs text-[#718078]">成交价由后端按原价与折扣统一计算，发布后立即对模型广场和新请求生效。</p>
          </div>

          <p v-if="mutation.isError.value" class="m-0 rounded-2 bg-red/8 px-3 py-2 text-xs text-[#e99595]">{{ mutation.error.value?.message }}</p>
          <div class="flex justify-end gap-2"><AButton ghost class="h-10 px-4 text-sm" @click="emit('close')">取消</AButton><AButton html-type="submit" :loading="mutation.isPending.value" class="h-10 px-5 text-sm font-700">发布价格</AButton></div>
        </AForm>

        <div class="border-t border-white/8 px-6 py-5">
          <h3 class="mb-3 flex items-center gap-2 text-sm"><Clock3 :size="16" class="text-[#74e89d]" />价格版本</h3>
          <p v-if="query.isPending.value" class="text-xs text-[#647268]">正在读取价格历史…</p>
          <div v-else class="grid gap-2">
            <article v-for="version in query.data.value?.versions" :key="version.id" class="grid grid-cols-[1fr_auto] gap-2 rounded-2 border border-white/7 bg-white/2 px-3 py-3 text-xs">
              <div><b class="text-[#c9d6cd]">{{ money(version.inputPrice) }} / {{ money(version.outputPrice) }}</b><p class="mb-0 mt-1 text-[#65736a]">原价 {{ money(version.originalInputPrice) }} / {{ money(version.originalOutputPrice) }} · 优惠 {{ version.discountPercent }}%</p></div>
              <div class="text-right text-[#65736a]"><span v-if="version.effectiveTo === null" class="mb-1 block text-[#75e69d]">当前生效</span><span>{{ date(version.effectiveFrom) }}</span></div>
            </article>
          </div>
        </div>
    </section>
  </AModal>
</template>
