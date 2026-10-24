# 供应商数据面第一阶段开发清单

更新日期：2026-10-24

## 本阶段结论

后台的供应商、加密凭证、渠道和模型部署已经进入 Chat JSON/SSE 真实执行链。配置了模型部署时，执行器会按渠道读取对应供应商定义，在网络请求前校验运行环境、协议、HTTPS 与精确域名白名单，再按需解密该渠道绑定的凭证。业务 Controller、请求 DTO、尝试链、普通日志和前端响应都不会接触明文密钥。

未配置模型部署时继续兼容 `PROVIDER_GATEWAY_URL` 内部网关路径。本阶段没有使用真实商业供应商 Key；通过本地模拟 OpenAI 兼容供应商完成了真实 PostgreSQL、加密凭证、HTTP JSON、SSE、模型映射与健康探测的端到端验收。

## 已交付

- 新增 `ProviderRuntimeService` 深模块，统一处理直接供应商与内部兼容网关两种运行模式。
- 直连模式只支持已经登记且启用的 `openai_compatible` 供应商；Anthropic 与 Google 原生协议继续明确拒绝，不做错误兼容。
- 渠道必须绑定当前运行环境中的启用凭证；凭证仅在网络调用前使用 AES-256-GCM 解密。
- `PROVIDER_OUTBOUND_HOSTS` 使用精确主机名白名单；生产环境强制 HTTPS，不跟随重定向。非生产环境只自动允许 loopback HTTP。
- JSON 与 SSE 调用使用部署的 `upstreamModelId`，对外响应继续展示 Nexus 公共模型 ID。
- 直接供应商不会收到 `x-nexus-channel-id`、`x-nexus-deployment-id` 等内部标识；这些头只发送给受控内部网关。
- 新增 `POST /api/admin/model-deployments/:id/test`，通过供应商 `/models` 验证鉴权和上游模型可见性，不生成内容、不消耗推理 Token。
- 管理端模型部署列表新增“测试连接”，成功显示供应商、模型和延迟，失败返回脱敏错误并更新渠道健康状态。

## 验收

- 单元测试覆盖 JSON 可信用量、SSE 完整结束、流式中断和未发送异常。
- PostgreSQL 端到端测试覆盖真实加密存储、按渠道解密、`Bearer` 认证、连接测试、JSON/SSE、模型映射、内部头隔离和出站域名阻断。
- 原渠道熔断、路由 fallback、尝试链和 Chat 计费回归测试通过。
- 全仓 typecheck、lint 和 build 通过后方可提交。

## 上线前剩余工作

1. 管理员录入低额度测试 Key，并在运行环境设置精确白名单，例如 `api.deepseek.com`。
2. 完成 DeepSeek JSON、SSE、客户端取消、429、401、5xx、超时和用量字段的真实商业接口验收。
3. 接入 Anthropic 与 Google 原生协议适配器，或评估固定版本 Portkey 作为第二个 Adapter。
4. 增加 BullMQ 周期主动探测、严格半开恢复、供应商配额同步和错误率告警。
5. 增加公开请求 `Idempotency-Key`，避免客户端重试导致重复调用和重复计费。
6. 生产环境将本地 AES 主密钥替换为 KMS envelope encryption，并配置出站网络策略。
