# 持久化计量 Outbox 运维说明

更新：2026-10-27。

## 一致性模型

推理请求日志、供应商尝试链和 `metering_outbox_events` 在同一个 PostgreSQL 事务提交。`usage_buckets` 由异步消费者聚合，BullMQ 只负责低延迟唤醒，不是事件事实来源。Redis 暂时不可用时，请求记录仍会持久化，恢复扫描器随后从 PostgreSQL 重新投递。

消费者对单个事件执行 `SELECT ... FOR UPDATE`，并在同一数据库事务内更新 `usage_buckets` 和 `processed_at`。并发消费、重复投递或 Worker 确认丢失只会成功聚合一次。事件载荷带版本号，当前只接受 `version=1`。

## 状态与恢复

- `pending`：`processed_at` 和 `dead_lettered_at` 均为空。失败后按指数退避设置下一次 `available_at`。
- `processed`：聚合成功并设置 `processed_at`，后续投递作为重复事件跳过。
- `dead`：达到 `METERING_OUTBOX_MAX_ATTEMPTS` 后设置 `dead_lettered_at`，等待人工处理。

每个 API 实例启动时立即扫描一次，此后按 `METERING_OUTBOX_POLL_MS` 周期扫描，每批最多 `METERING_OUTBOX_BATCH_SIZE` 条。多个实例可以同时扫描；事件唯一约束和消费事务锁负责去重。

## 管理接口

下列接口只允许平台 `admin` 访问：

- `GET /api/admin/metering-events?status=pending|dead|processed&limit=50`：查看事件状态，`limit` 范围为 1–200。
- `POST /api/admin/metering-events/:id/replay`：将一个未处理的死信重置为待处理并立即尝试投递。不存在、已处理或并非死信的事件返回 404。

重放前先根据 `lastError` 修复代码、配置或数据。重放不会改写已处理事件，也不会绕过消费幂等保护。

## 指标与告警

- `nexus_metering_events_total{outcome}`：`processed`、`duplicate`、`failed`、`dead_lettered` 和 `dispatch_failed` 结果计数。
- `nexus_metering_processing_duration_seconds`：消费事务耗时。
- `nexus_metering_outbox_events{status}`：待处理、死信及最近一小时已处理事件数。
- `NexusMeteringOutboxBacklog`：待处理超过 100 条并持续 10 分钟。
- `NexusMeteringDeadLetters`：存在死信并持续 2 分钟。

告警后先检查 PostgreSQL、Redis 和 Worker 日志。Redis 恢复后扫描器会自动补投；死信需修复根因后通过管理接口重放。

## 验证

`npm run test:metering-outbox -w @gateway/api` 使用真实 PostgreSQL/Redis，覆盖 Redis 投递失败后的补偿扫描、多消费者竞争、重复投递、指数重试、死信、修复重放以及管理接口的 401/403/400/404 边界。

当前 Outbox 聚合请求用量，不替代 Chat 账本的额度预占、结算和人工对账。Audio、Image 和 Video 仍需分别接入其计量单位和账本流程。
