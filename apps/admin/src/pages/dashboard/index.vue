<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Activity, Boxes, ChevronLeft, ChevronRight, CircleUserRound, Database, DatabaseZap, KeyRound, LayoutDashboard, LogOut, Menu, RefreshCw, Search, ServerCog, Settings2, Tag, UsersRound, X } from 'lucide-vue-next'
import type { AdminModel } from './api'
import { BrandLogo, DataSkeleton, ModelLogo, feedback } from '@gateway/ui'
import { authState, signOut } from '../../stores/auth'
import { getAdminModels, getAdminUsers, getModelSummary, getUserSummary, updateAdminModel } from './api'
import ProviderConfiguration from './cmp/ProviderConfiguration.vue'
import ModelPricingDialog from './cmp/ModelPricingDialog.vue'
import ModelTagsDialog from './cmp/ModelTagsDialog.vue'
import BillingManagement from './cmp/BillingManagement.vue'
import RankingSources from './cmp/RankingSources.vue'
import AuditLogs from './cmp/AuditLogs.vue'
import LoginSessions from './cmp/LoginSessions.vue'

type Section = 'overview' | 'models' | 'rankings' | 'channels' | 'users' | 'billing' | 'audit' | 'sessions'
const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const section = computed<Section>(() => ['models', 'rankings', 'channels', 'users', 'billing', 'audit', 'sessions'].includes(String(route.params.section)) ? route.params.section as Section : 'overview')
const navOpen = ref(false)
const modelSearch = ref('')
const userSearch = ref('')
const modelPage = ref(1)
const userPage = ref(1)
const pricingModel = ref<AdminModel | null>(null)
const tagsModel = ref<AdminModel | null>(null)
const modelParams = computed(() => new URLSearchParams({ ...(modelSearch.value ? { query: modelSearch.value } : {}), page: String(modelPage.value), pageSize: '20' }).toString())
const userParams = computed(() => new URLSearchParams({ ...(userSearch.value ? { query: userSearch.value } : {}), page: String(userPage.value), pageSize: '20' }).toString())
const modelSummary = useQuery({ queryKey: ['admin-model-summary'], queryFn: getModelSummary })
const userSummary = useQuery({ queryKey: ['admin-user-summary'], queryFn: getUserSummary })
const models = useQuery({ queryKey: computed(() => ['admin-models', modelParams.value]), queryFn: () => getAdminModels({ query: modelSearch.value || undefined, page: modelPage.value, pageSize: 20 }) })
const users = useQuery({ queryKey: computed(() => ['admin-users', userParams.value]), queryFn: () => getAdminUsers({ query: userSearch.value || undefined, page: userPage.value, pageSize: 20 }) })
const modelPages = computed(() => models.data.value?.pagination.totalPages || 1)
const userPages = computed(() => users.data.value?.pagination.totalPages || 1)
const modelMutation = useMutation({ mutationFn: ({ model, patch }: { model: AdminModel; patch: Partial<Pick<AdminModel, 'enabled' | 'featured' | 'status' | 'tags'>> }) => updateAdminModel(model.id, patch), onSuccess: async () => { feedback.success('模型状态已更新'); await Promise.all([queryClient.invalidateQueries({ queryKey: ['admin-models'] }), queryClient.invalidateQueries({ queryKey: ['admin-model-summary'] })]) }, onError: (error) => feedback.error(error, '模型状态更新失败') })
const heading = computed(() => ({ billing: ['BILLING OPERATIONS', '额度与对账', '查看真实账户、授予额度并核实待处理调用。'], overview: ['PLATFORM OVERVIEW', '平台总览', '查看全平台身份、模型与服务配置状态。'], models: ['MODEL REGISTRY', '大模型配置', '维护模型目录、公开状态、精选位和生命周期。'], rankings: ['BENCHMARK SOURCES', '排行榜数据源', '同步公开基准、确认模型映射并控制评分来源。'], channels: ['PROVIDER ROUTING', '供应商渠道', '管理加密凭证绑定、渠道健康度与模型部署。'], users: ['IDENTITY CENTER', '用户与权限', '管理平台账户、角色、状态和登录访问。'], audit: ['SECURITY AUDIT', '审计日志', '追踪平台管理变更、失败操作与访问来源。'], sessions: ['LOGIN SESSIONS', '登录会话', '查看全平台登录设备并即时撤销异常会话。'] }[section.value]))
function initials(name = 'A') { return name.trim().slice(0, 2).toUpperCase() }
function price(value: number | null) { return value === null ? '—' : `¥${value.toFixed(value < 1 ? 2 : 1)}` }
function date(value: string | null) { return value ? new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '从未登录' }
function openPricing(model: AdminModel) { pricingModel.value = model }
function openTags(model: AdminModel) { tagsModel.value = model }
function tagLabel(tag: string) { return ({ 'tags.new': '新上线', 'tags.hot': '热门', 'tags.lowLatency': '低延迟', 'tags.value': '高性价比', 'tags.creator': '创作者优选' }[tag] ?? tag) }
async function logout() { await signOut(); await router.replace('/login') }
async function pricingSaved() {
  pricingModel.value = null
  feedback.success('模型价格已发布')
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['admin-models'] }),
    queryClient.invalidateQueries({ queryKey: ['admin-model-pricing'] }),
  ])
}
async function tagsSaved() {
  tagsModel.value = null
  feedback.success('模型标签已保存')
  await queryClient.invalidateQueries({ queryKey: ['admin-models'] })
}
</script>

<template><main class="platform-page"><div class="platform-glow" /><aside :class="['platform-sidebar',{open:navOpen}]"><div class="platform-brand"><BrandLogo /><button @click="navOpen=false"><X :size="18" /></button></div><div class="platform-space"><span>N</span><div><small>内部管理空间</small><b>Nexus Platform</b></div></div><nav><small>平台运营</small><RouterLink to="/admin" :class="{active:section==='overview'}"><LayoutDashboard :size="18" />平台总览</RouterLink><RouterLink to="/admin/models" :class="{active:section==='models'}"><Boxes :size="18" />大模型配置<b>{{ modelSummary.data.value?.total ?? '—' }}</b></RouterLink><RouterLink to="/admin/rankings" :class="{active:section==='rankings'}"><DatabaseZap :size="18" />排行榜数据源</RouterLink><RouterLink to="/admin/users" :class="{active:section==='users'}"><UsersRound :size="18" />用户与权限<b>{{ userSummary.data.value?.total ?? '—' }}</b></RouterLink><RouterLink to="/admin/billing" :class="{active:section==='billing'}"><Database :size="18" />额度与对账</RouterLink><small>服务配置</small><RouterLink to="/admin/channels" :class="{active:section==='channels'}"><ServerCog :size="18" />供应商渠道</RouterLink><span class="planned"><Database :size="18" />价格规则<i>规划中</i></span><span class="planned"><Settings2 :size="18" />路由策略<i>规划中</i></span><small>安全审计</small><RouterLink to="/admin/audit" :class="{active:section==='audit'}"><Activity :size="18" />审计日志</RouterLink><RouterLink to="/admin/sessions" :class="{active:section==='sessions'}"><KeyRound :size="18" />登录会话</RouterLink></nav><div class="platform-profile"><span>{{ initials(authState.user?.name) }}</span><div><b>{{ authState.user?.name }}</b><small>{{ authState.user?.email }}</small></div><button aria-label="退出登录" @click="logout"><LogOut :size="18" /></button></div></aside>
<section class="platform-main"><header><button class="platform-menu" @click="navOpen=true"><Menu :size="20" /></button><div><small>{{ heading[0] }}</small><b>{{ heading[1] }}</b></div><span><CircleUserRound :size="18" />{{ authState.user?.name }}</span></header><div class="platform-content"><div class="platform-heading"><div><small>{{ heading[0] }}</small><h1>{{ heading[1] }}</h1><p>{{ heading[2] }}</p></div><button v-if="section==='models'" @click="models.refetch()"><RefreshCw :size="17" :class="{spin:models.isFetching.value}" />同步配置</button></div>

<template v-if="section==='overview'"><DataSkeleton v-if="modelSummary.isPending.value || userSummary.isPending.value" :rows="6" label="正在加载平台概览" /><template v-else><div class="platform-stats"><article><span>全部用户</span><strong>{{ userSummary.data.value?.total ?? '—' }}</strong><small>{{ userSummary.data.value?.active ?? '—' }} 个活跃账户</small></article><article><span>配置模型</span><strong>{{ modelSummary.data.value?.total ?? '—' }}</strong><small class="ok">● {{ modelSummary.data.value?.enabled ?? '—' }} 个已上线</small></article><article><span>供应商</span><strong>{{ modelSummary.data.value?.providers ?? '—' }}</strong><small>上游模型渠道</small></article><article><span>观察中</span><strong>{{ modelSummary.data.value?.observing ?? '—' }}</strong><small>等待稳定性验证</small></article></div><section class="platform-panel"><header><div><h2>配置中心</h2><p>平台配置与客户工作区完全隔离。</p></div></header><div class="config-grid"><RouterLink to="/admin/models"><Boxes :size="21" /><div><b>大模型目录</b><small>上下线、精选位、状态与价格</small></div><em>{{ modelSummary.data.value?.total ?? '—' }}</em></RouterLink><RouterLink to="/admin/users"><UsersRound :size="21" /><div><b>身份与权限</b><small>内部人员与客户账户管理</small></div><em>{{ userSummary.data.value?.total ?? '—' }}</em></RouterLink><RouterLink to="/admin/channels"><ServerCog :size="21" /><div><b>供应商渠道</b><small>凭证、部署与健康熔断</small></div><em>→</em></RouterLink><RouterLink to="/admin/rankings"><DatabaseZap :size="21" /><div><b>排行榜数据源</b><small>公开基准、快照与模型映射</small></div><em>→</em></RouterLink></div></section></template></template>

<section v-else-if="section==='models'" class="platform-panel section-panel"><header><div><h2>模型配置清单</h2><p>包含公开与已停用模型，定价和标签保存后立即影响模型广场。</p></div></header><div class="platform-filter"><label><Search :size="18" /><input v-model="modelSearch" placeholder="搜索模型、API ID 或供应商…" @input="modelPage=1"></label></div><div class="platform-table"><table><thead><tr><th>模型</th><th>供应商</th><th>类型</th><th>当前价格</th><th>定价</th><th>生命周期</th><th>精选</th><th>公开状态</th></tr></thead><tbody><tr v-if="models.isPending.value"><td colspan="8" class="p-4"><DataSkeleton compact :rows="3" label="正在加载模型配置" /></td></tr><tr v-else-if="models.isError.value"><td colspan="8" class="empty error">{{ models.error.value?.message }}</td></tr><tr v-for="model in models.data.value?.data" :key="model.id"><td><div class="model-cell"><ModelLogo :owner="model.owner" :name="model.name" :accent="model.accent" :size="32" /><div><b>{{ model.name }}</b><small>{{ model.slug }}</small><span class="admin-model-tags"><i v-for="tag in model.tags.slice(0,2)" :key="tag">{{ tagLabel(tag) }}</i><button type="button" @click="openTags(model)"><Tag :size="12" />{{ model.tags.length ? '编辑标签' : '添加标签' }}</button></span></div></div></td><td>{{ model.provider }}</td><td>{{ model.type }}</td><td><div class="price-cell"><b>{{ price(model.inputPrice) }}</b><del v-if="model.discountPercent>0">{{ price(model.originalInputPrice) }}</del><small v-if="model.discountPercent>0">-{{ model.discountPercent }}%</small></div></td><td><button class="pricing-button" @click="openPricing(model)">配置价格</button></td><td><button :class="['lifecycle',model.status]" @click="modelMutation.mutate({model,patch:{status:model.status==='stable'?'observing':'stable'}})"><i />{{ model.status==='stable'?'稳定':'观察中' }}</button></td><td><button :class="['toggle',{on:model.featured}]" @click="modelMutation.mutate({model,patch:{featured:!model.featured}})"><i /></button></td><td><button :class="['availability',{enabled:model.enabled}]" @click="modelMutation.mutate({model,patch:{enabled:!model.enabled}})">{{ model.enabled?'已上线':'已停用' }}</button></td></tr></tbody></table></div><footer><span>共 {{ models.data.value?.pagination.total ?? 0 }} 个模型</span><div><button :disabled="modelPage<=1" @click="modelPage--"><ChevronLeft :size="17" /></button><b>{{ modelPage }} / {{ modelPages }}</b><button :disabled="modelPage>=modelPages" @click="modelPage++"><ChevronRight :size="17" /></button></div></footer></section>

<ProviderConfiguration v-else-if="section==='channels'" />

<RankingSources v-else-if="section==='rankings'" />
<BillingManagement v-else-if="section==='billing'" />

<section v-else-if="section==='users'" class="platform-panel section-panel"><header><div><h2>平台用户清单</h2><p>这里管理平台身份，客户工作区成员将在后续拆为独立租户数据。</p></div></header><div class="platform-filter"><label><Search :size="18" /><input v-model="userSearch" placeholder="搜索姓名或邮箱…" @input="userPage=1"></label></div><div class="platform-table"><table><thead><tr><th>用户</th><th>角色</th><th>状态</th><th>最近登录</th><th>创建时间</th></tr></thead><tbody><tr v-if="users.isPending.value"><td colspan="5" class="p-4"><DataSkeleton compact :rows="3" label="正在加载用户" /></td></tr><tr v-else-if="users.isError.value"><td colspan="5" class="empty error">{{ users.error.value?.message }}</td></tr><tr v-for="user in users.data.value?.data" :key="user.id"><td><div class="person"><span>{{ initials(user.name) }}</span><div><b>{{ user.name }}</b><small>{{ user.email }}</small></div></div></td><td><span class="role">{{ user.role==='admin'?'管理员':user.role==='manager'?'工作区管理员':'只读用户' }}</span></td><td><span :class="['user-status',user.status]"><i />{{ user.status==='active'?'正常':user.status==='invited'?'待邀请':'已停用' }}</span></td><td>{{ date(user.lastLoginAt) }}</td><td>{{ date(user.createdAt) }}</td></tr></tbody></table></div><footer><span>共 {{ users.data.value?.pagination.total ?? 0 }} 位用户</span><div><button :disabled="userPage<=1" @click="userPage--"><ChevronLeft :size="17" /></button><b>{{ userPage }} / {{ userPages }}</b><button :disabled="userPage>=userPages" @click="userPage++"><ChevronRight :size="17" /></button></div></footer></section>
<AuditLogs v-else-if="section==='audit'" />
<LoginSessions v-else />
</div></section><ModelPricingDialog v-if="pricingModel" :model="pricingModel" @close="pricingModel=null" @saved="pricingSaved" /><ModelTagsDialog v-if="tagsModel" :model="tagsModel" @close="tagsModel=null" @saved="tagsSaved" /></main></template>
