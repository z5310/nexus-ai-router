# nexus-ai-router

多模型 API 聚合平台。仓库采用 Turbo 单仓库多项目结构，包含客户控制台、平台管理后台、NestJS API、共享 UI/契约、PostgreSQL、Redis/BullMQ 与本地对象存储基础设施。

## 本地启动

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis minio
npm run db:migrate
npm run dev
```

- Web: http://localhost:5173
- Admin: http://localhost:5174
- API: http://localhost:3000
- API 文档: http://localhost:3000/docs
- MinIO 控制台: http://localhost:9001

## 核心命令

```bash
npm run dev
npm run dev:web
npm run dev:admin
npm run dev:api
npm run build
npm run typecheck
npm run db:migrate
```

## 当前接口

| 方法 | 路径 | 能力 |
| --- | --- | --- |
| `GET` | `/api/health` | API 存活探针 |
| `GET` | `/api/ready` | PostgreSQL 与 Redis 就绪探针 |
| `GET` | `/api/models` | 模型搜索、类型/供应商筛选、评分/速度/价格排序与分页 |
| `GET` | `/api/models/:publicId` | 模型详情，包含成交价、原价、折扣、价格生效时间、能力、评分和状态 |
| `GET` | `/api/rankings` | 按综合、编码、成本、速度指标排行 |
| `GET` | `/api/dashboard/overview` | 用量指标、24 小时趋势、余额和最近请求 |
| `GET` | `/api/dashboard/requests` | 按请求 ID 或模型检索调用记录 |
| `GET` | `/api/dashboard/requests/:requestId` | 查看请求模型、实际模型、命中规则、首 Token 延迟和完整上游尝试链 |
| `GET` | `/api/workspaces` | 查询当前用户可访问的工作区与工作区角色 |
| `GET/PATCH` | `/api/workspaces/current` | 读取或修改当前工作区名称和默认展示币种 |
| `GET` | `/api/workspaces/current/members` | 查询当前工作区成员 |
| `PATCH/DELETE` | `/api/workspaces/current/members/:id` | 修改成员角色或移除成员，并撤销失效权限与密钥 |
| `GET/PATCH` | `/api/workspaces/current/ip-policy` | 读取或修改 API Key 来源 IP 允许列表 |
| `GET/POST` | `/api/console/models` | 查询或添加当前工作区模型配置 |
| `PATCH/DELETE` | `/api/console/models/:id` | 修改或移除当前工作区模型配置 |
| `GET/POST` | `/api/console/routes` | 查询或创建当前工作区路由规则 |
| `PATCH/DELETE` | `/api/console/routes/:id` | 修改或删除当前工作区路由规则 |
| `GET/POST` | `/api/keys` | 查询或创建当前工作区 API 密钥 |
| `DELETE` | `/api/keys/:id` | 撤销 API 密钥 |
| `POST` | `/api/auth/login` | 邮箱密码登录，返回短时访问令牌并写入 HttpOnly 刷新会话 |
| `POST` | `/api/auth/register` | 创建普通客户账户并自动登录 |
| `POST` | `/api/auth/refresh` | 轮换刷新会话并签发新的访问令牌 |
| `POST` | `/api/auth/logout` | 撤销当前刷新会话 |
| `GET` | `/api/auth/me` | 获取当前登录用户 |
| `POST` | `/api/auth/forgot-password` | 创建 15 分钟有效的一次性密码重置凭证，响应不会暴露账号是否存在 |
| `POST` | `/api/auth/reset-password` | 使用一次性凭证重置密码并撤销全部旧会话 |
| `POST` | `/api/auth/change-password` | 校验当前密码后更新密码并撤销全部旧会话 |
| `GET` | `/api/auth/sessions` | 查看当前账户的活跃登录会话与当前设备标记 |
| `DELETE` | `/api/auth/sessions/:id` | 撤销指定登录会话 |
| `DELETE` | `/api/auth/sessions` | 撤销当前账户的全部登录会话 |
| `GET` | `/api/auth/oauth/github` | 发起 GitHub OAuth 登录 |
| `GET` | `/api/auth/oauth/google` | 发起 Google OAuth 登录 |
| `GET` | `/api/admin/users` | 管理员搜索、筛选和分页查看用户 |
| `GET` | `/api/admin/users/summary` | 用户状态与角色统计 |
| `POST` | `/api/admin/users` | 创建用户 |
| `PATCH` | `/api/admin/users/:id` | 修改用户资料、角色、状态或密码 |
| `GET` | `/api/admin/models` | 管理员检索、筛选和分页查看模型配置 |
| `GET` | `/api/admin/models/summary` | 模型、供应商和运行状态统计 |
| `PATCH` | `/api/admin/models/:id` | 修改模型上架、推荐和运行状态 |
| `GET/PUT` | `/api/admin/models/:id/pricing` | 查询价格历史或立即发布新的原价、折扣和成交价版本 |
| `GET/POST` | `/api/admin/providers` | 查询或登记平台供应商主数据 |
| `PATCH/DELETE` | `/api/admin/providers/:id` | 编辑、启停或删除供应商定义 |
| `GET/POST` | `/api/admin/provider-credentials` | 查询或创建加密的供应商凭证元数据 |
| `PATCH/DELETE` | `/api/admin/provider-credentials/:id` | 轮换、启停或删除供应商凭证 |
| `POST` | `/api/console/playground/chat` | 使用当前工作区权限进行文字模型在线调用 |
| `GET/POST` | `/api/console/audio-generations` | 查询本人音频任务或创建工作区音频生成任务 |
| `GET` | `/api/console/audio-generations/:id` | 查询本人音频任务状态与结果地址 |
| `POST` | `/api/console/audio-generations/:id/cancel` | 取消尚未进入处理阶段的音频任务 |
| `GET` | `/v1/models` | API Key 鉴权的当前工作区 OpenAI 兼容模型列表 |
| `POST` | `/v1/chat/completions` | API Key 鉴权的 OpenAI 兼容模型调用，支持 JSON 与 SSE 流式响应 |

查询示例：

```bash
curl 'http://localhost:3000/api/models?type=text&sort=speed&page=1&pageSize=20'
curl 'http://localhost:3000/api/rankings?metric=cost&limit=10'
curl 'http://localhost:3000/api/dashboard/requests?query=deepseek&limit=20'
curl -N 'http://localhost:3000/v1/chat/completions' \
  -H 'Authorization: Bearer nxs_live_your_key' \
  -H 'Content-Type: application/json' \
  -d '{"model":"openai/gpt-6.1-sol","messages":[{"role":"user","content":"你好"}],"stream":true}'
```

Swagger 文档位于 `http://localhost:3000/docs`。接口错误统一返回 Problem Details，包含 `status`、`detail`、`instance` 和 `request_id`。
工作区接口可通过 `x-workspace-id` 指定目标租户；未传时自动使用当前用户最早加入的有效工作区。
音频控制台任务通过登录会话与 `x-workspace-id` 鉴权，完整文本仅保存在任务表供 Worker 调用，列表和详情响应只返回截断预览。配置 `AUDIO_GENERATION_GATEWAY_URL` 后，Worker 调用内部数据面的 `/audios/generations`，兼容直接结果 URL 和异步任务 ID 两种响应。未配置数据面时任务会明确失败为 `upstream_503`，不会生成假结果。

推理接口使用控制台生成的 `nxs_live_` API Key。调用模型必须已在对应工作区启用；启用的路由规则会按请求类型和稳定流量分桶参与选择，支持优先级、最低成本、最低延迟及连接前主备故障转移。成功和失败请求都会写入工作区请求日志、上游尝试明细与小时用量桶。

## 前端页面

| 路径 | 状态 |
| --- | --- |
| `/` | 首页，已完成 |
| `/models` | 模型搜索、筛选、排序，已接模型目录 API |
| `/models/:provider/:model` | 模型详情，已接数据库目录详情 API；音频模型已接任务提交、状态轮询、试听与历史 |
| `/rankings` | 分类 Top 5、综合/使用率/7 日热度专项榜与四种完整指标排行，已接排行 API |
| `/docs` | 独立开发文档页 |
| `/login` | 邮箱密码、GitHub 和 Google 登录，会话恢复与角色分流 |
| `/register` | 客户账户注册并自动登录 |
| `/forgot-password` | 申请一次性密码重置凭证 |
| `/reset-password` | 使用一次性凭证设置新密码 |
| `/admin` | 管理员入口，验证角色后跳转独立的 5174 管理端 |
| `http://localhost:5174/admin/channels` | 平台供应商渠道与模型部署配置，已接真实 API |
| `/console` | 用量概览、趋势和最近请求，已接控制台 API |
| `/console/models` | 模型管理，已接模型目录 API |
| `/console/logs` | 调用日志，已接请求日志 API |
| `/console/routes` | 路由规则查询、新建、编辑、启停与删除，已接真实 CRUD API |
| `/console/keys` | 密钥命名创建、仅显示一次、查询与撤销，已接真实 CRUD API |
| `/console/billing` | 账单与余额 UI；待接账单 API |
| `/console/members` | 工作区成员读取、改角色和移除；邀请与所有权转移待开发 |
| `/console/settings` | 已接工作区资料与 API 来源 IP 允许列表；完整审计待开发 |

## 工程结构

- `apps/web`：面向付费客户的官网、文档和工作区控制台，可用 `npm run dev:web` 独立运行。
- `apps/admin`：面向开发、运营和平台管理员的独立管理端，可用 `npm run dev:admin` 独立运行。
- `apps/api`：NestJS API，可用 `npm run dev:api` 独立运行。
- `packages/contracts`：前后端共享的接口字段与枚举，避免页面和 API 各自定义一套数据结构。
- `packages/ui`：Web 与 Admin 共用的品牌组件、模型 Logo 和设计变量。
- `apps/api/src/*/*.controller.ts`：HTTP 输入输出，只负责协议适配。
- `apps/api/src/*/*.service.ts`：业务编排和领域映射。
- `apps/api/src/*/*.repository.ts`：数据库查询与排序规则。
- `apps/*/src/lib/http.ts`：各应用独立的 Axios 实例，统一处理 API 地址、访问令牌、刷新会话、重试和标准错误。
- `apps/*/src/pages/<domain>/api`：按页面领域放置 `types.ts`、`endpoints.ts` 与 `index.ts`，页面只消费自身所需接口。
- `apps/*/src/pages/<domain>/cmp`：页面私有组件与页面目录共置，避免与跨应用共享组件混杂。
- `packages/ui`：统一映射品牌、模型厂商标识和设计变量，Web 与 Admin 共同消费。
- `uno.config.ts`：Web 与 Admin 共用的 UnoCSS 主题、快捷规则和转换器；页面特殊视觉规则保留在各自目录，不再集中到单体样式文件。
- 页面通过 Vue Query 管理加载、缓存和失败状态；后端未启动时回退为标注清晰的演示数据。

新增字段时，先修改 `@gateway/contracts`，再修改迁移、实体、服务映射与页面消费，保证字段含义在整个链路一致。

Turbo 负责跨项目依赖顺序、并行运行和构建缓存。根目录 `npm run dev` 会同时启动 API、Web 和 Admin；每个应用仍保留独立运行命令。

完整的能力盘点、接口状态与 P0/P1/P2 规划见 [产品路线图](docs/product-roadmap.md)。后端接口的实际完成度、缺口和建议新增入口见 [后端接口完成度与缺口清单](docs/backend-api-gap-audit.md)。面向高并发、安全、性能、高可用和长期维护的技术演进方案见 [架构审计与演进方案](docs/architecture-evolution-plan.md)。本轮实施进度见 [开发清单](docs/development-checklist.md)，多供应商调用层决策见 [多模型供应商网关选型](docs/llm-provider-gateway-selection.md)，公开榜单聚合边界见 [模型排行榜数据源设计](docs/model-ranking-data-sources.md)。

## 第三方登录配置

GitHub OAuth App 的回调地址配置为 `http://localhost:3000/api/auth/oauth/github/callback`，Google OAuth Client 的回调地址配置为 `http://localhost:3000/api/auth/oauth/google/callback`。在 `.env` 中设置：

```bash
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

未配置的登录方式会安全返回登录页并显示配置提示。第三方登录首次使用时创建普通 `viewer` 用户，不会自动获得平台管理权限。

密码登录连续失败 5 次后会锁定 15 分钟。密码重置凭证有效期为 15 分钟、只能使用一次；重置或修改密码会撤销该账户的全部刷新会话。开发环境的找回密码响应会包含 `debugToken` 方便本地联调，生产环境不会返回该字段，部署时应将重置凭证交给邮件服务发送。

刷新会话在 PostgreSQL 事务内轮换，继承原登录的绝对过期时间。重复使用已轮换令牌会撤销该登录链的全部刷新会话，其他设备不受影响。前端通过 Web Locks 串行化同源标签页的刷新请求，并合并单页面请求；不支持 Web Locks 时仅合并单页面请求。不同端口或域名不共享锁，Web/Admin 跨源同时使用同一 Cookie 仍有冲突风险。访问请求会按 `sid + sub` 查询当前有效会话和用户状态，因此会话撤销、密码重置、账户停用和角色变更会从下一次请求生效。

前端刷新协调逻辑测试：`npm run test:refresh -w @gateway/ui`。测试覆盖单页面请求合并、失败后再次刷新和模拟同源标签页的串行轮换；真实浏览器与后端联调待数据库恢复后验证。

迁移完成后可运行 `npm run test:session-rotation -w @gateway/api` 验证并发轮换、祖先令牌重放、设备隔离和过期令牌。测试仅创建并清理自身的临时账户。新增迁移 `SessionRotation1760000008000` 必须在部署新 API 前执行。

## 供应商目录与凭证管理

平台管理员先通过 `/api/admin/providers` 维护供应商目录，包括唯一标识、显示名称、协议适配器、API Base URL 元数据、官方文档、支持能力、排序与启停状态。供应商标识创建后不可修改；已绑定凭证或渠道时不可删除。API Base URL 当前只作为控制面元数据保存，不会自动成为携带解密凭证的出站目标。

平台管理员通过 `/api/admin/provider-credentials` 管理各环境的供应商 API Key：

- `GET /api/admin/provider-credentials`：按供应商或环境查询凭证元数据。
- `POST /api/admin/provider-credentials`：新增凭证并立即使用 AES-256-GCM 加密。
- `PATCH /api/admin/provider-credentials/:id`：重命名、轮换、启用或停用凭证。
- `DELETE /api/admin/provider-credentials/:id`：删除凭证。

凭证只能选择已登记且启用的供应商。接口只返回 `••••末四位`、密钥版本和轮换时间，不会返回明文或数据库密文。同一环境下每个供应商只允许启用一个凭证。`ENCRYPTION_KEY` 建议使用 32 字节随机值的 Base64，`ENCRYPTION_KEY_VERSION` 用于轮换识别，`PROVIDER_CREDENTIAL_ENV` 决定数据面读取哪个环境的凭证。生产环境应将本地加密实现替换为云 KMS envelope encryption，并为轮换和删除补充不可变审计日志。

## 供应商渠道与模型部署

平台管理员通过 `/api/admin/provider-channels` 管理渠道，通过 `/api/admin/model-deployments` 将平台模型映射到渠道和上游模型 ID。渠道保存环境、区域、超时、最大并发和健康状态；模型部署保存优先级、权重与启停状态。Admin 页面入口为 `http://localhost:5174/admin/channels`。

推理时先执行工作区模型规则，再在模型内部按渠道健康度、优先级和基于请求 ID 的稳定权重选择部署。连续三次失败会把渠道置为 `unhealthy` 并冷却 60 秒，成功后恢复；工作区和渠道分别使用 Redis 并发租约。数据面仅接收渠道/部署标识，数据库中的解密凭证尚未接入外部出站。

## 模型价格版本

平台管理员在 `http://localhost:5174/admin/models` 的“配置价格”弹窗中维护输入/输出原价、折扣比例和计价单位。后端按固定四位小数计算成交价，并在同一事务中关闭旧版本、创建新版本和更新模型当前价格投影。首页、模型广场和详情页只读取 API 返回的当前价格；有折扣时展示划线原价和折扣比例。当前版本立即生效，预约生效、请求级价格版本快照、账本和预算预占仍属于后续计费阶段。

## 模型排行榜数据源

平台管理员在 `http://localhost:5174/admin/rankings` 管理公开榜单来源。当前支持 Hugging Face 官方 Leaderboard API：后端拉取后保存快照，管理员显式映射外部模型与平台模型，再启用来源。公开 `GET /api/rankings` 会返回每个分数的 `scoreSource` 与响应级 `sources`，Web 排行榜展示来源署名。

Nginx 只转发站内 API，不直接代理第三方榜单。第三方域名、响应格式、分数归一化和错误保留策略全部封装在 NestJS 适配器中；公开请求只读本地快照。详细边界和后续定时同步计划见 [模型排行榜数据源设计](docs/model-ranking-data-sources.md)。

## 本地演示身份

迁移会写入仅供本地开发的演示账号：

- 普通工作区：`demo@nexus.cn` / `nexus-demo`
- 平台管理员：`admin@nexus.cn` / `Nexus@123456`

生产部署前必须替换演示身份与 `JWT_SECRET`。访问令牌保存在浏览器内存中，刷新令牌仅通过 `HttpOnly + SameSite=Lax` Cookie 传递。
