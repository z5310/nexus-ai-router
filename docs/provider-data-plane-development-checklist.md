# 供应商数据面第一阶段开发清单

更新日期：2026-10-26

## 本阶段结论

后台的供应商、加密凭证、渠道和模型部署已经进入 Chat JSON/SSE 真实执行链。配置了模型部署时，执行器会按渠道读取对应供应商定义，在网络请求前校验运行环境、协议、HTTPS 与精确域名白名单，再按需解密该渠道绑定的凭证。业务 Controller、请求 DTO、尝试链、普通日志和前端响应都不会接触明文密钥。

未配置模型部署时继续兼容 `PROVIDER_GATEWAY_URL` 内部网关路径。本阶段已使用低额度 DeepSeek Key 完成真实商业供应商验收；同时保留本地模拟 OpenAI 兼容供应商测试，持续覆盖 PostgreSQL、加密凭证、HTTP JSON、SSE、模型映射、取消传播与健康探测。

## 已交付

- 新增 `ProviderRuntimeService` 深模块，统一处理直接供应商与内部兼容网关两种运行模式。
- 直连模式只支持已经登记且启用的 `openai_compatible` 供应商；Anthropic 与 Google 原生协议继续明确拒绝，不做错误兼容。
- 渠道必须绑定当前运行环境中的启用凭证；凭证仅在网络调用前使用 AES-256-GCM 解密。
- `PROVIDER_OUTBOUND_HOSTS` 使用精确主机名白名单；生产环境强制 HTTPS，不跟随重定向。非生产环境只自动允许 loopback HTTP。
- JSON 与 SSE 调用使用部署的 `upstreamModelId`，对外响应继续展示 Nexus 公共模型 ID。
- 直接供应商不会收到 `x-nexus-channel-id`、`x-nexus-deployment-id` 等内部标识；这些头只发送给受控内部网关。
- 新增 `POST /api/admin/model-deployments/:id/test`，通过供应商 `/models` 验证鉴权和上游模型可见性，不生成内容、不消耗推理 Token。
- 管理端模型部署列表新增“测试连接”，成功显示供应商、模型和延迟，失败返回脱敏错误并更新渠道健康状态。
- 新增 `POST /api/admin/model-deployments/:id/acceptance` 和管理端“真实验收”：依次执行模型发现、非流式 JSON、SSE 首 Token/完整用量及客户端取消，并返回分步骤耗时和计量结果。
- 非流式 `POST /v1/chat/completions` 支持 `Idempotency-Key`：同一工作区、同一请求体在 24 小时内复用原始响应和 `x-request-id`，并返回 `idempotency-replayed: true`。键只保存 SHA-256 摘要；相同键用于不同载荷、处理中重复请求或失败后重试均返回 409，避免重复上游调用和重复计费。后续幂等请求会分批清理过期记录，避免响应表无限增长。
- 流式请求携带 `Idempotency-Key` 会明确返回 400；SSE 结果持久化与安全重放不属于本阶段能力。

## 验收

- 单元测试覆盖 JSON 可信用量、SSE 完整结束、流式中断和未发送异常。
- PostgreSQL 端到端测试覆盖真实加密存储、按渠道解密、`Bearer` 认证、连接测试、JSON/SSE、模型映射、内部头隔离和出站域名阻断。
- 原渠道熔断、路由 fallback、尝试链和 Chat 计费回归测试通过。
- PostgreSQL 集成测试覆盖成功重放、JSON 键顺序无关、载荷冲突、并发占位、失败保护、24 小时过期复用与原始键不落库。
- 2026-10-26 DeepSeek 官方接口验收通过：发现 `deepseek-flash`，JSON 1617 ms（35/14 tokens）、SSE 1213 ms、首 Token 700 ms（35/11 tokens），取消在 574 ms 内传播；凭证以加密记录保存，响应和日志未输出明文。
- 隔离工作区首次调用真实返回“连接成功”，公共模型保持 `deepseek/deepseek-v4.1-flash`，请求日志状态为 `success`，尝试链记录实际供应商 `deepseek`；验收用户、工作区和 API Key 已清理。
- 全仓 typecheck、lint 和 build 通过后方可提交。

## 上线前剩余工作

1. 补齐 DeepSeek 真实接口的 401、429、5xx 与超时故障注入验收；正常 JSON、SSE、用量和客户端取消已完成。
2. 接入 Anthropic 与 Google 原生协议适配器，或评估固定版本 Portkey 作为第二个 Adapter。
3. 增加 BullMQ 周期主动探测、严格半开恢复、供应商配额同步和错误率告警。
4. 扩展流式请求的安全恢复语义；当前只对非流式 Chat 提供 `Idempotency-Key` 重放保护。
5. 生产环境将本地 AES 主密钥替换为 KMS envelope encryption，并配置出站网络策略。
