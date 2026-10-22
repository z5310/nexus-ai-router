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
| `GET` | `/api/ready` | PostgreSQL 就绪探针 |
| `GET` | `/api/models` | 模型搜索、类型/供应商筛选、评分/速度/价格排序与分页 |
| `GET` | `/api/models/:publicId` | 模型详情，包含价格、能力、评分和状态 |
| `GET` | `/api/rankings` | 按综合、编码、成本、速度指标排行 |
| `GET` | `/api/dashboard/overview` | 用量指标、24 小时趋势、余额和最近请求 |
| `GET` | `/api/dashboard/requests` | 按请求 ID 或模型检索调用记录 |
| `GET` | `/api/workspaces` | 查询当前用户可访问的工作区与工作区角色 |
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
推理接口使用控制台生成的 `nxs_live_` API Key。调用模型必须已在对应工作区启用；成功和失败请求都会写入工作区请求日志与小时用量桶。

## 前端页面

| 路径 | 状态 |
| --- | --- |
| `/` | 首页，已完成 |
| `/models` | 模型搜索、筛选、排序，已接模型目录 API |
| `/models/:provider/:model` | 模型详情，已接详情 API并支持演示数据回退 |
| `/rankings` | 分类 Top 5、综合/使用率/7 日热度专项榜与四种完整指标排行，已接排行 API |
| `/docs` | 独立开发文档页 |
| `/login` | 邮箱密码、GitHub 和 Google 登录，会话恢复与角色分流 |
| `/register` | 客户账户注册并自动登录 |
| `/forgot-password` | 申请一次性密码重置凭证 |
| `/reset-password` | 使用一次性凭证设置新密码 |
| `/admin` | 管理员入口，验证角色后跳转独立的 5174 管理端 |
| `/console` | 用量概览、趋势和最近请求，已接控制台 API |
| `/console/models` | 模型管理，已接模型目录 API |
| `/console/logs` | 调用日志，已接请求日志 API |
| `/console/routes` | 路由规则查询、新建、编辑、启停与删除，已接真实 CRUD API |
| `/console/keys` | 密钥命名创建、仅显示一次、查询与撤销，已接真实 CRUD API |
| `/console/billing` | 账单与余额 UI；待接账单 API |
| `/console/members` | 工作区成员 UI；平台级账号与 RBAC 由 `/admin` 管理 |
| `/console/settings` | 工作区与安全设置 UI；待接设置 API |

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

完整的能力盘点、接口状态与 P0/P1/P2 规划见 [产品路线图](docs/product-roadmap.md)。面向高并发、安全、性能、高可用和长期维护的技术演进方案见 [架构审计与演进方案](docs/architecture-evolution-plan.md)。本轮实施进度见 [开发清单](docs/development-checklist.md)，多供应商调用层决策见 [多模型供应商网关选型](docs/llm-provider-gateway-selection.md)。

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

## 本地演示身份

迁移会写入仅供本地开发的演示账号：

- 普通工作区：`demo@nexus.cn` / `nexus-demo`
- 平台管理员：`admin@nexus.cn` / `Nexus@123456`

生产部署前必须替换演示身份与 `JWT_SECRET`。访问令牌保存在浏览器内存中，刷新令牌仅通过 `HttpOnly + SameSite=Lax` Cookie 传递。
