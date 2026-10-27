# 项目文档索引

更新日期：2026-10-27

## 当前状态入口

以下文档描述当前实现，发生冲突时按顺序以前者为准：

1. [生产化改造清单](production-upgrade-backlog.md)：近期实施顺序、验收条件和已验证生产能力。
2. [开发清单](development-checklist.md)：跨前后端逐项状态及下一批工作。
3. [后端接口完成度与缺口](backend-api-gap-audit.md)：后端领域、接口和验证缺口。
4. 各领域开发清单：计费、供应商数据面、音频任务、工作区协作等专项状态。

[架构审计与演进方案](architecture-evolution-plan.md)保留初始审计与目标架构，其中“当前缺少”不代表最新状态。[产品路线图](product-roadmap.md)用于说明产品方向，不替代生产验收清单。

## 专项文档

- [可观测性与告警基线](observability-operations.md)
- [计费账本开发清单](billing-development-checklist.md)
- [供应商数据面开发清单](provider-data-plane-development-checklist.md)
- [音频生成任务开发清单](audio-generation-development-checklist.md)
- [工作区协作开发清单](workspace-collaboration-development-checklist.md)
- [管理端安全阶段评审](admin-security-stage-review.md)
- [前端产品审计](frontend-product-audit.md)

## 维护约定

- 只把已有自动化测试、真实数据库/依赖验证或浏览器验收支持的行为标为“已完成”。
- 新能力同时更新生产化清单、开发清单和对应领域专项文档。
- 历史阶段记录保留原验收事实；后续阶段已替代其“下一步”时，明确写出已被哪一阶段承接。
- 迁移总数、接口列表和运行限制以当前代码及迁移命令结果为准。
