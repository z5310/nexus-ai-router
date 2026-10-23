# 模型排行榜数据源设计

更新日期：2026-10-23

## 结论

Nginx 只负责把站内 `/api/*` 转发到 NestJS，不直接代理第三方排行榜。外部榜单需要经过后端的固定适配器拉取、格式校验、分数归一化、快照落库、人工模型映射和来源署名，再由 `GET /api/rankings` 统一返回。

这样可以避免把第三方响应格式、限流、故障和跨域问题暴露给浏览器，也能阻止管理员输入任意 URL 形成 SSRF。公开页面只读取 PostgreSQL 快照，用户访问排行榜时不会同步请求第三方。

## 第一阶段数据源

当前实现 Hugging Face 官方 Leaderboard API 适配器：

- 固定上游：`https://huggingface.co/api/datasets/{owner}/{dataset}/leaderboard`
- 数据集标识只接受 `owner/dataset`，不能配置任意 URL。
- 同时兼容响应中的 `modelId` 与历史 `model_id` 字段。
- 保存外部排名、原始分、归一化分、验证状态、作者和采样时间。
- 迁移预置 `SWE-bench/SWE-bench_Verified`，默认关闭，必须先同步和映射。

Hugging Face 的榜单接口适合接入公开模型评测。Arena 提供公开数据集，可在后续通过独立 dataset adapter 导入；LiveBench 更适合由定时任务读取其公开产物；Artificial Analysis API 需要密钥与署名，可作为商业数据源单独适配。不同来源不能只按模型名称自动合并。

## 数据流

1. 平台管理员在 `/admin/rankings` 新增或选择来源。
2. 管理端调用 `POST /api/admin/ranking-sources/:id/sync`。
3. 后端访问固定 Hugging Face 域名，校验响应并保存一次不可变快照。
4. 管理员逐项确认 `external_model_id` 与平台 `models.id` 的映射。
5. 来源启用后，`GET /api/rankings?metric=...` 按来源优先级读取最新已映射快照。
6. 返回的每个模型包含 `scoreSource`，响应还提供去重后的 `sources`，公开页面展示署名和采样时间。

没有外部映射的模型继续使用平台目录配置分；成本和速度仍来自平台配置与运行数据。接口不会虚构外部来源。

## 管理接口

- `GET /api/admin/ranking-sources`
- `POST /api/admin/ranking-sources`
- `GET /api/admin/ranking-sources/:id`
- `PATCH /api/admin/ranking-sources/:id`
- `DELETE /api/admin/ranking-sources/:id`
- `POST /api/admin/ranking-sources/:id/sync`
- `POST /api/admin/ranking-sources/:id/mappings`
- `DELETE /api/admin/ranking-sources/mappings/:mappingId`

所有管理接口只允许平台 `admin`。同步失败会保留上一次成功快照并记录错误，不会用空结果覆盖公开榜单。

## 后续开发

- 使用 BullMQ 建立定时同步、指数退避、单来源互斥锁和失败告警。
- 增加 Arena/LiveBench 独立适配器以及数据许可证、署名规则配置。
- 增加来源健康度、快照差异、异常分数波动与待确认映射队列。
- 为模型别名、版本和供应商建立可审计的映射规则，禁止模糊自动绑定。
- 将“能力基准分”和“平台真实运行质量分”拆成可解释的复合评分版本。

