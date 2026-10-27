# 可观测性与告警基线

更新：2026-10-27。

## 接口与超时

- `GET /api/health` 只判断 API 进程存活，不访问外部依赖。
- `GET /api/ready` 并行检查 PostgreSQL 和 Redis。每项检查受 `READINESS_TIMEOUT_MS` 限制，默认 2 秒；任一失败时返回 HTTP 503、`status=degraded` 和各依赖状态，不返回连接地址或异常详情。
- `GET /metrics` 输出 Prometheus 文本格式。队列与供应商渠道采集受 `METRICS_COLLECTION_TIMEOUT_MS` 限制，默认 1 秒；单项采集失败不会拖垮抓取，`nexus_collector_success` 会标记失败。

`/metrics` 不包含工作区、用户、请求 ID、提示词、密钥或渠道 ID。部署时只应通过集群内 Service 或受控监控网络暴露该端点。

## 指标

| 指标 | 用途 |
| --- | --- |
| `nexus_http_requests_total` | 按方法、路由模板和状态码统计请求量与错误率 |
| `nexus_http_request_duration_seconds` | API 端到端延迟直方图 |
| `nexus_inference_requests_total` | 按公开模型和结果统计推理请求 |
| `nexus_inference_request_duration_seconds` | 推理总延迟 |
| `nexus_inference_first_token_duration_seconds` | SSE 首 Token 延迟 |
| `nexus_provider_attempts_total` | 按供应商、结果和错误码统计尝试链 |
| `nexus_provider_attempt_duration_seconds` | 供应商尝试延迟 |
| `nexus_dependency_ready` | PostgreSQL、Redis 最近一次 readiness 结果 |
| `nexus_queue_jobs` | 音频队列 waiting、active、delayed、failed 数量 |
| `nexus_provider_channels` | 启用渠道按供应商和持久健康状态的数量 |
| `nexus_collector_success` | 抓取时队列和渠道采集是否成功 |
| `nexus_metering_events_total` | 持久化计量处理、重复、失败、死信及投递失败次数 |
| `nexus_metering_processing_duration_seconds` | 计量消费事务耗时 |
| `nexus_metering_outbox_events` | 待处理、死信及最近一小时处理数量 |

HTTP 指标使用 Nest/Fastify 的路由模板，例如 `/api/console/audio-generations/:id`，不会把资源 ID 写入标签。推理指标只使用目录中的公开模型 ID；供应商尝试不使用渠道 ID、部署 ID或工作区 ID。

## 失败定位

所有 HTTP 响应返回 `x-request-id`。生产入口接收合法的外部相关 ID 时会生成带该前缀的新请求 ID，Pino 请求完成日志和推理请求记录使用同一个 ID。排障顺序：

1. 从客户端或告警关联的请求取得 `x-request-id`。
2. 在结构化 API 日志中查询该 ID，确认路由、状态码和总耗时。
3. 在请求日志与尝试链中查询同一 ID，核对选中模型、路由规则、供应商尝试、错误码和耗时。
4. 同时查看 `nexus_dependency_ready`、供应商失败率和队列积压，判断是平台依赖、上游渠道还是异步 Worker 问题。

## 告警

Prometheus 规则位于 `ops/prometheus/alerts.yml`，覆盖 API 5xx、依赖不可用、首 Token P95、供应商失败率、音频队列积压、计量 Outbox 积压/死信和采集失败。阈值是首版基线，接入真实生产流量后应按 SLO 和容量测试校准。规则文件只定义告警条件，Alertmanager 路由与通知接收人由部署环境配置。计量事件恢复和人工重放见 [持久化计量 Outbox 运维说明](metering-outbox-operations.md)。

当前尚未接入跨服务 OpenTelemetry trace，也未实现供应商周期主动探测；供应商渠道指标反映验收和真实调用写入的最近持久状态。
