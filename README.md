# nexus-ai-router

多模型 API 聚合平台。当前仓库包含 Vue 3 控制台、NestJS API、PostgreSQL、Redis/BullMQ 与本地对象存储基础设施。

## 本地启动

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis minio
npm run db:migrate
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3000
- API 文档: http://localhost:3000/docs
- MinIO 控制台: http://localhost:9001

## 核心命令

```bash
npm run dev
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
| `GET` | `/v1/models` | OpenAI 兼容模型列表 |

查询示例：

```bash
curl 'http://localhost:3000/api/models?type=text&sort=speed&page=1&pageSize=20'
curl 'http://localhost:3000/api/rankings?metric=cost&limit=10'
curl 'http://localhost:3000/api/dashboard/requests?query=deepseek&limit=20'
```

Swagger 文档位于 `http://localhost:3000/docs`。接口错误统一返回 Problem Details，包含 `status`、`detail`、`instance` 和 `request_id`。

## 前端页面

| 路径 | 状态 |
| --- | --- |
| `/` | 首页，已完成 |
| `/models` | 模型搜索、筛选、排序，已接模型目录 API |
| `/models/:provider/:model` | 模型详情，已接详情 API并支持演示数据回退 |
| `/rankings` | 分类 Top 5、综合/使用率/7 日热度专项榜与四种完整指标排行，已接排行 API |
| `/docs` | 独立开发文档页 |
| `/login` | 登录界面与演示工作区跳转；待接认证会话 API |
| `/console` | 用量概览、趋势和最近请求，已接控制台 API |
| `/console/models` | 模型管理，已接模型目录 API |
| `/console/logs` | 调用日志，已接请求日志 API |
| `/console/routes` | 路由规则 UI；待接规则 CRUD API |
| `/console/keys` | 密钥管理 UI与本地演示交互；待接密钥 CRUD API |
| `/console/billing` | 账单与余额 UI；待接账单 API |
| `/console/members` | 成员权限 UI；待接成员与 RBAC API |
| `/console/settings` | 工作区与安全设置 UI；待接设置 API |

## 工程结构

- `packages/contracts`：前后端共享的接口字段与枚举，避免页面和 API 各自定义一套数据结构。
- `apps/api/src/*/*.controller.ts`：HTTP 输入输出，只负责协议适配。
- `apps/api/src/*/*.service.ts`：业务编排和领域映射。
- `apps/api/src/*/*.repository.ts`：数据库查询与排序规则。
- `apps/web/src/lib/api-client.ts`：统一处理 API 地址、JSON 和错误。
- `apps/web/src/components/ModelLogo.vue`：统一映射模型厂商标识，品牌 SVG 来自 Lobe Icons。
- 页面通过 Vue Query 管理加载、缓存和失败状态；后端未启动时回退为标注清晰的演示数据。

新增字段时，先修改 `@gateway/contracts`，再修改迁移、实体、服务映射与页面消费，保证字段含义在整个链路一致。
