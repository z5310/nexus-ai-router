# 后端接口完成度与缺口清单

更新日期：2026-10-23

本文以当前 `apps/api` 的 Controller、Service、数据库实体、迁移和集成测试为准，区分“接口存在”和“业务闭环已完成”。状态含义：

- `已完成`：已有接口、持久化、权限边界，并有对应验证。
- `部分完成`：已有数据结构或 CRUD，但尚未进入真实运行链路。
- `未开发`：当前没有可用后端接口或核心领域实现。
- `暂缓`：实现需要先明确安全边界或外部系统。

## 当前结论

后端已经具备账号、会话、工作区隔离、成员管理、工作区模型配置、API Key、公共模型目录、排行榜、Chat JSON/SSE、基础日志与用量聚合。路由规则现已进入真实推理链路，支持稳定流量分桶、策略排序、主备故障转移和上游尝试明细。当前离“可商业运行的多模型路由平台”仍有以下核心缺口：

1. **供应商仍是单一网关配置。** 凭证已加密管理，但调用仍使用单一 `PROVIDER_GATEWAY_URL`/`PROVIDER_GATEWAY_API_KEY`，尚无 Channel/Deployment、健康探测和熔断。
2. **没有计费账本。** 当前只记录估算成本，不支持余额、额度预占、预算、充值、退款、发票或对账。
3. **媒体和异步任务接口未建立。** Image、Audio、Video、Embedding 目前只有模型目录类型，没有真实生成、任务查询、取消和结果存储接口。

## 分域完成度

| 领域 | 状态 | 已有能力 | 仍缺能力 |
| --- | --- | --- | --- |
| 健康检查 | 已完成 | `/api/health`、`/api/ready`；readiness 检查 PostgreSQL 和 Redis | 供应商探测、队列积压、对象存储探测和分级降级状态 |
| 账号与会话 | 部分完成 | 注册、登录、刷新轮换、登出、当前用户、改密、会话列表/撤销、登录锁定、GitHub/Google OAuth | 生产邮件发送、邮箱验证、MFA、企业 SSO/SCIM、管理员代撤会话及安全事件审计 |
| 密码找回 | 部分完成 | 一次性 15 分钟令牌、哈希存储、消费后撤销全部会话；开发环境返回调试令牌 | 生产邮件投递、模板、发送限流/重试、邮件回执与滥用监控 |
| 工作区 | 部分完成 | 列表、当前工作区读取/修改、成员读取/改角色/移除、IP Allowlist、角色权限矩阵 | 邀请/接受/撤销/重发、所有权转移、成员分页搜索、工作区创建/归档、管理员停用、操作审计 |
| Project | 未开发 | 有 `projects` 表及默认项目初始化 | Project CRUD、成员/权限、API Key/路由/日志/用量的 `project_id` 隔离 |
| 公共模型目录 | 已完成 | 模型列表、详情、facets、价格、能力、评分、状态、排行榜和真实 7 日调用聚合 | 评分来源/版本/采样时间、目录缓存失效和发布审核 |
| 平台模型管理 | 部分完成 | 管理端统计、列表、启停、精选、生命周期状态修改 | 新增/删除、完整资料编辑、价格版本、生效时间、上下游模型 ID、能力参数、渠道绑定、发布审计 |
| 工作区模型 | 部分完成 | CRUD、别名、启停、RPM、预算字段与租户隔离 | 预算实际执行、Project 绑定、渠道/部署选择、并发与配额覆盖策略 |
| 路由规则 | 部分完成 | CRUD、稳定流量分桶、优先级/最低成本/最低延迟排序、主备故障转移、命中规则和尝试链持久化 | 配置版本/缓存、渠道健康感知、熔断、命中统计和规则模拟接口 |
| Chat 推理 | 部分完成 | OpenAI 兼容 `/v1/models`、`/v1/chat/completions`，JSON/SSE、取消、RPM、工作区并发、连接前 fallback、首 Token 延迟、日志和基础成本 | 多渠道选择、有限重试、熔断、幂等键、上游请求 ID、SSE 中断后的精确计量 |
| 供应商凭证 | 部分完成/暂缓 | 管理员 CRUD、AES-256-GCM、环境隔离、轮换元数据、非明文响应 | Provider/Channel/Deployment 模型、连通性测试、健康状态、配额；解密凭证接入真实数据面需先确认可信目标与出站边界 |
| 请求日志 | 部分完成 | 请求 ID、请求/实际模型、命中规则、尝试次数、首 Token、每次目标供应商/模型/耗时/错误、Token、成本；支持详情接口 | 游标分页、日期/状态/项目/渠道筛选、上游请求 ID、trace、导出与保留策略 |
| 用量看板 | 部分完成 | 24 小时请求/Token/延迟/费用趋势、最近请求 | 环比真实计算、可选时间范围、按模型/项目/密钥聚合、统计物化与大数据量查询策略 |
| 计费与余额 | 未开发 | 响应合同保留 `balance`，当前恒为 `null` | 不可变账本、额度预占/结算/释放、预算、充值、支付回调、退款、优惠、账单、发票、对账 |
| API Key | 已完成基础版 | 命名创建、仅显示一次、哈希校验、列表、撤销、即时权限兜底 | Key 更新/轮换、细粒度 scopes、Project 绑定、到期时间、额度、来源限制、批量撤销和审计 |
| 管理员用户 | 部分完成 | 汇总、分页列表、详情、创建、资料/角色/状态/密码修改 | 批量操作、停用原因、会话查看/强制下线、安全事件、邀请流程、操作审计 |
| 媒体与 Embedding | 未开发 | 目录能表达 image/video/audio/embedding 类型 | `/v1/embeddings`、图片生成、语音、视频异步任务、状态查询、取消、回调、对象存储和内容安全 |
| 异步任务 | 未开发 | BullMQ 已连接 Redis | Worker、幂等消费者、重试策略、失败队列、任务恢复、对账/报表/媒体任务 |
| 可观测与运维 | 部分完成 | 结构化日志、请求 ID、敏感头脱敏、Helmet、限流、优雅关闭 | OpenTelemetry、Prometheus、SLO/告警、CI、生产镜像、迁移作业、备份/PITR、恢复演练、压测 |

## 已存在的后端入口

下列入口已经存在，开发时不应重复建设：

- 身份：`/api/auth/register`、`login`、`refresh`、`logout`、`me`、密码重置/修改、会话管理和 OAuth。
- 租户：`/api/workspaces`、`/api/workspaces/current`、成员及 IP policy。
- Console：`/api/console/models`、`/api/console/routes`、`/api/console/playground/chat`。
- 密钥：`/api/keys`。
- 公共目录：`/api/models`、`/api/rankings`。
- 管理端：`/api/admin/users`、`/api/admin/models`、`/api/admin/provider-credentials`。
- 数据面：`/v1/models`、`/v1/chat/completions`。
- 用量：`/api/dashboard/overview`、`/api/dashboard/requests`、`/api/dashboard/requests/:requestId`。

## 2026-10-23 路由执行阶段交付

- `RoutingExecutorService` 根据请求模型类型查找启用规则，并用 `requestId + ruleId` 进行可复现的流量分桶。
- `priority` 保持主备顺序；`lowest_cost` 和 `lowest_latency` 会在同类型、仍可用的主备候选中排序。
- 非流式调用在上游失败时依次尝试候选；流式调用只允许在响应建立前切换，已经开始输出后不透明重试。
- `request_logs` 记录请求模型、实际模型、命中规则、尝试次数、首 Token 延迟和错误码。
- `inference_attempts` 按顺序记录每次目标模型、供应商、状态、耗时和脱敏错误。
- `GET /api/dashboard/requests/:requestId` 返回完整尝试链，并继续受工作区 `usage:read` 权限隔离。

## 建议新增的接口

### P0：打通模型调用核心闭环

| 建议接口/模块 | 目的 | 验收重点 |
| --- | --- | --- |
| `RoutingExecutor` 内部接口（已完成第一阶段） | 让已保存的规则真实选择模型和 fallback | 同一请求记录规则、目标和确定性尝试顺序 |
| `ProviderDeployment` / `ProviderChannel` CRUD | 将供应商、凭证、上游模型 ID、区域、超时、配额和健康状态分开管理 | 禁止向日志/响应暴露明文；部署可以停用和探测 |
| `GET /api/dashboard/requests/:requestId`（已完成） | 展示一次调用的完整尝试链 | 包含首 Token、各次上游耗时、状态和脱敏错误 |
| `POST /api/admin/provider-deployments/:id/test` | 受控连通性检查 | 有出站域名 allowlist、超时、审计和脱敏 |
| 幂等请求支持 | 防止客户端重试重复计费/重复任务 | 同工作区同 idempotency key 返回同一业务结果 |
| 价格版本与快照 | 避免历史请求随当前价格变化 | 每次调用保存价格版本和计费快照 |

供应商凭证解密后发送到外部地址属于敏感出站行为。在明确批准具体网关/供应商域名、TLS 校验、出站 allowlist 和日志脱敏方案前，只实施领域模型、执行器接口和测试替身，不把数据库密钥接到任意 `PROVIDER_GATEWAY_URL`。

### P0：建立商业计费闭环

建议新增 `ledger`、`budgets`、`billing` 模块：

- `GET /api/billing/balance`
- `GET /api/billing/ledger`
- `GET /api/billing/invoices`
- `GET/PATCH /api/workspaces/current/budgets`
- 支付订单、签名回调、退款和对账内部接口

账本使用固定精度金额和不可变流水；推理前预占、结束后结算、失败释放，全部以幂等键保护。余额不能由请求日志临时求和代替。

### P1：补齐组织协作

- `POST/GET /api/workspaces/current/invitations`
- `POST /api/workspace-invitations/:token/accept`
- `POST /api/workspaces/current/invitations/:id/resend`
- `DELETE /api/workspaces/current/invitations/:id`
- `POST /api/workspaces/current/transfer-ownership`
- `/api/projects` CRUD，以及 Project 范围的密钥、路由、日志和用量

邀请必须一次性、限时、绑定邮箱；接受、撤销、过期和重放需要数据库集成测试。

### P1：补齐平台运营

- 模型完整 CRUD、价格版本、能力参数和发布审核。
- 管理员查看/撤销用户会话、批量停用、原因记录。
- 模型、凭证、路由、成员、预算和密钥的不可变审计日志。
- 供应商健康、错误率、延迟、配额和成本运营看板。

### P2：扩展推理类型

- OpenAI 兼容 Embedding。
- 图片、音频、视频统一任务模型：创建任务、查询、取消、回调、重试和结果过期。
- MinIO/S3 对象存储、签名 URL、生命周期与内容安全扫描。

## 下一阶段建议开发顺序

1. **建立 Provider Channel/Deployment 与受控健康探测。** 路由执行已有候选链，下一步需要真实渠道维度和熔断状态；凭证出站仍遵守明确授权边界。
2. **做价格版本、账本和预算。** 未完成账本前不要把控制台余额或充值作为真实商业能力开放。
3. **补工作区邀请、所有权转移和 Project 隔离。** 让团队协作与成本归属可控。
4. **补全管理端模型/渠道/价格配置及审计。** 让运营可以安全发布配置。
5. **最后扩展媒体任务与生产运维。** 媒体任务依赖对象存储、队列、幂等和计费基础。

## 验证缺口

现有真实数据库集成测试覆盖目录、权限、会话轮换、撤权、成员竞态、IP policy、限流与推理并发。下一批至少应增加：

- 更多规则叠加、分桶比例统计，以及真实网关下 SSE 开始后的不重试测试。
- 供应商超时、熔断、恢复和多实例健康状态测试。
- 账本并发预占、重复回调、取消与中断对账测试。
- 邀请过期、撤销、重放和所有权转移事务测试。
- 请求详情、游标分页、保留期和敏感字段脱敏测试。
- 媒体任务创建、取消、回调幂等、对象清理和失败队列测试。
