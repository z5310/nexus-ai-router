# Nexus AI Router 产品盘点与路线图

更新日期：2026-10-22

状态说明：以下能力盘点保留初始规划快照。多租户、Chat JSON/SSE 入口、会话事务轮换、工作区设置/成员管理/API IP 允许列表已有后续实现；最新完成范围、限制与交付顺序统一参见 [开发清单](development-checklist.md)。

## 1. 产品定位

Nexus AI Router 是面向 AI 应用团队的多模型接入、路由、观测与计费平台。客户通过统一 API 使用多个模型，在控制台配置模型、密钥和路由；平台运营人员通过独立管理端维护用户、模型目录、供应商渠道、价格与风险策略。

核心用户分为三类：

- 开发者：希望用一个 OpenAI 兼容接口接入多个文本、图像、视频、音频与向量模型。
- 工作区负责人：关注稳定性、预算、密钥、团队权限、调用日志和账单。
- 平台运营与管理员：负责模型上架、供应商渠道、成本与售价、用户、风控和审计。

## 2. 当前能力盘点

### 已完成真实链路

| 领域 | 当前能力 | 状态 |
| --- | --- | --- |
| 官网与模型发现 | 首页、模型广场、模型详情、分类和多指标排行统一读取数据库；排行使用量由请求日志聚合 | 已完成 |
| 身份认证 | 注册、密码登录、刷新令牌、退出、当前用户、找回/重置/修改密码 | 已完成 |
| 第三方登录 | GitHub、Google OAuth 发起与回调；缺少生产环境应用凭证时会安全失败 | 已完成，需部署配置 |
| 会话安全 | 查看会话、撤销单个会话、撤销全部会话、登录失败锁定 | API 已完成 |
| 工作区模型 | 查询、添加、修改别名/优先级/RPM/预算/状态、移除 | 已完成 |
| API 密钥 | 命名创建、哈希保存、只显示一次、列表、撤销 | 已完成 |
| 路由规则 | 按请求类型、优先级/成本/延迟策略配置主模型与故障转移模型 | 本轮完成 |
| 用量概览 | 24 小时请求、Token、延迟、费用、请求日志 | 已完成，并已按用户隔离 |
| 平台用户管理 | 统计、搜索、分页、创建、角色/状态/密码更新 | API 已完成，基础列表 UI 已完成 |
| 平台模型管理 | 统计、搜索、分页、启停、推荐、运行状态 | 已完成基础能力 |
| 工程基础 | Turbo 单仓多应用、共享 contracts/UI、Axios 封装、Vue Query、UnoCSS、迁移体系 | 已完成 |

### 部分完成

| 领域 | 已有内容 | 缺口 |
| --- | --- | --- |
| OpenAI 兼容层 | `GET /v1/models` | 缺少真实推理、流式响应、错误映射、重试和幂等 |
| 工作区模型 | 有客户侧配置 | 缺少供应商渠道绑定、区域、并发、健康度与渠道密钥 |
| 路由 | 规则 CRUD 已完成 | 缺少真实网关执行器、权重分流、熔断、重试和运行验证 |
| 请求日志 | 有查询与概览 | 缺少 trace、错误详情、上游渠道、首字耗时、导出与保留策略 |
| 管理端用户 | 有真实 API 和列表 | 缺少创建/编辑弹窗、批量操作、详情、会话与审计视图 |
| 管理端模型 | 有基础状态管理 | 缺少模型新建、完整字段编辑、供应商与价格版本管理 |
| 多租户 | 数据已按用户隔离 | 仍以用户 ID 代替工作区，缺少组织、项目和成员关系模型 |

### 仅有界面或演示数据

- 工作区账单、余额、充值和交易记录。
- 工作区成员与角色管理。
- 工作区名称、币种、IP 白名单和审计开关。
- 管理端角色矩阵、安全中心、审计日志和全局会话页面。
- 公开站点已移除本地业务数据回退；数据库迁移中的目录与请求记录可作为本地联调示例数据。

### 尚未建设

- 真实模型代理：`/v1/chat/completions`、流式 SSE、图像/音频/视频任务接口。
- 供应商渠道管理：凭证加密、渠道健康检查、区域、配额和成本价。
- 计费内核：价格版本、预扣/结算、余额账本、发票、退款和欠费停机。
- 多租户模型：Workspace、Project、WorkspaceMember、邀请与细粒度 RBAC。
- 网关治理：限流、预算、熔断、重试、幂等、内容风控、审计和告警。
- 生产运维：指标监控、分布式追踪、日志聚合、备份恢复、密钥轮换与 CI/CD。

## 3. 当前接口清单

### 公共与模型目录

- `GET /api/health`、`GET /api/ready`
- `GET /v1/models`
- `GET /api/models`、`GET /api/models/:publicId`
- `GET /api/rankings`

### 认证与账户

- `POST /api/auth/register`、`POST /api/auth/login`
- `POST /api/auth/refresh`、`POST /api/auth/logout`、`GET /api/auth/me`
- `POST /api/auth/forgot-password`、`POST /api/auth/reset-password`、`POST /api/auth/change-password`
- `GET /api/auth/sessions`、`DELETE /api/auth/sessions/:id`、`DELETE /api/auth/sessions`
- `GET /api/auth/oauth/github`、`GET /api/auth/oauth/google` 及对应回调

### 客户控制台

- `GET /api/dashboard/overview`、`GET /api/dashboard/requests`
- `GET/POST /api/console/models`
- `PATCH/DELETE /api/console/models/:id`
- `GET/POST /api/console/routes`
- `PATCH/DELETE /api/console/routes/:id`
- `GET/POST /api/keys`
- `DELETE /api/keys/:id`

### 平台管理端

- `GET /api/admin/users/summary`
- `GET/POST /api/admin/users`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id`
- `GET /api/admin/models/summary`
- `GET /api/admin/models`
- `PATCH /api/admin/models/:id`

## 4. 产品路线图

### P0：形成可调用、可计费、可隔离的最小商业闭环

目标：客户能充值或获得额度，创建密钥，调用真实模型，并在失败时自动切换渠道，平台能准确记录成本与收入。

1. 建立 Workspace、Project、WorkspaceMember 和邀请机制，将现有 userId 数据迁移到默认工作区。
2. 建立 Provider、ProviderChannel、ProviderCredential 与 ModelDeployment；凭证必须加密保存并支持轮换。
3. 实现 API Key 鉴权和 `/v1/chat/completions`，支持流式 SSE、超时、重试、故障转移和统一错误码。
4. 让路由规则进入真实执行链路，并记录命中规则、上游渠道、尝试次数和最终结果。
5. 建立价格版本、余额账本、用量明细和原子扣费；预算与余额不足时拒绝调用。
6. 补齐平台端供应商、渠道、价格、路由和用户详情管理。

验收标准：两个独立工作区的数据完全隔离；一次真实调用可从 API Key、路由决策、上游请求、Token 用量、成本到余额变化完整追踪。

### P1：增强团队协作与运营效率

1. 工作区成员邀请、Owner/Admin/Developer/Billing/Viewer 权限。
2. 请求详情、失败原因、trace、导出、日志保留策略。
3. 账单、充值、交易、发票和低余额提醒。
4. 路由权重、A/B 分流、灰度发布、健康检查和熔断。
5. 管理端审计日志、会话管理、封禁原因和批量操作。
6. Dashboard 时间范围、模型/项目筛选、成本与收入分析。

### P2：企业与规模化能力

1. 企业 SSO、SCIM、细粒度权限、自定义角色。
2. IP 白名单、Webhook、内容安全、数据驻留和合规导出。
3. 自动充值、信用额度、合同价、折扣和渠道利润分析。
4. SLA 监控、异常告警、跨区域容灾和供应商自动切换。
5. SDK、CLI、Terraform Provider 和公开状态页。

## 5. 开发原则

- 控制台和平台管理端保持独立应用、路由、权限和发布流程。
- 先修改 `packages/contracts`，再完成迁移、实体、仓储、服务、控制器和前端消费。
- 所有客户数据必须带 workspaceId 或明确的租户键；任何查询都不能依赖前端传入租户身份。
- 金额与扣费使用账本和数据库事务，不能由聚合值反推余额。
- API Key、供应商密钥和 OAuth Secret 不记录明文，不写日志，不返回第二次。
- 路由、计费和调用日志以同一个 requestId/traceId 串联，方便审计和排障。
- 每个增量优先交付可验证的纵向闭环，避免只增加静态页面。

## 6. 当前迭代结果

本轮将静态路由卡片替换为真实的规则 CRUD，包含命名、请求类型、选择策略、主模型、故障转移、流量比例和启停状态；同时为请求日志与用量桶增加用户归属，使 Dashboard 接口必须登录并只返回当前账户数据。这为后续接入真实网关执行器提供了可直接消费的配置模型。
