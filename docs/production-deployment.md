# CI 与生产部署基线

更新日期：2026-10-28

本项目使用 GitHub Actions、GHCR 和 Docker Compose 完成可重复发布，不依赖 Jenkins。当前基线已经在本机以干净生产镜像和隔离 Compose 栈验证；真实生产主机、TLS 入口、备份/PITR 和告警路由仍需按部署环境实施与演练。

## CI 门禁

`.github/workflows/ci.yml` 在 Pull Request、`main` 分支推送和手动触发时执行：

1. 使用锁文件安装依赖，依次执行 lint、typecheck、全仓 build。
2. 对生产依赖执行 npm 高危漏洞审计。
3. 启动 PostgreSQL 17 与 Redis 8，连续执行两次迁移验证幂等性。
4. 顺序执行 UI 刷新协调测试和全部 API 单元/集成测试，避免共享数据库测试并发污染。
5. 回滚并重放最新一条迁移，检查 `down`/`up` 可执行性。
6. 构建 API、Web、Admin 三类生产镜像。

`.github/workflows/publish-images.yml` 只在 `main` 的 CI 成功后自动发布，也支持人工触发。镜像写入 GHCR，使用不可变的 `sha-<完整提交 SHA>` 标签；`main` 的成功构建同时更新 `latest`。发布包含 provenance、SBOM 和 Trivy HIGH/CRITICAL 扫描。仓库 Actions 需要 `packages: write` 和 `security-events: write` 权限，组织策略不得禁止 GHCR 写入或 SARIF 上传。

## 生产主机准备

生产主机需要 Docker Engine 和 Compose v2。把仓库中的 `compose.production.yaml`、`ops/` 和部署脚本放在同一发布目录，并从示例创建环境文件：

```sh
cp ops/production.env.example ops/production.env
chmod 600 ops/production.env
```

必须替换数据库密码、`DATABASE_URL`、JWT 密钥、加密密钥、公开域名、供应商出站白名单和可信代理网段。Web 与 Admin 默认只绑定 `127.0.0.1`，应由主机上的 TLS 反向代理转发；Admin 建议再受 VPN 或 Zero Trust 访问策略保护。`TRUSTED_PROXY_CIDRS` 只填写实际反向代理到 API 的受信网络。

数据库和 Redis 使用持久卷。生产数据库应另行配置加密备份、PITR、异地副本和恢复演练；Compose 卷本身不构成备份。

## 发布

先在 GHCR 确认目标提交的三个镜像和扫描结果均存在，再执行：

```sh
./ops/scripts/deploy.sh sha-<完整提交 SHA>
```

脚本先校验 Compose 配置并拉取同一不可变标签，然后启动 PostgreSQL/Redis、运行一次性迁移容器。只有迁移成功才会启动或更新 API、Web、Admin，并等待全部健康检查通过。API 进程不会在启动时隐式执行迁移。

生产发布前还应确认外部 TLS 探测、登录、首个低额度模型调用、账本对平、Prometheus 抓取和告警通知。当前脚本负责单机 Compose 发布，不会自动登录远程主机，也不替代变更审批。

## 回滚

应用回滚使用上一条已经验证且与当前数据库向前兼容的不可变标签：

```sh
./ops/scripts/rollback.sh sha-<上一条兼容提交 SHA>
```

回滚脚本只切换 API、Web、Admin 镜像，不自动回滚数据库。迁移必须遵循 expand/contract：先增加兼容结构，待旧应用不再运行后再在后续版本删除旧结构。若迁移不兼容，应停止发布并按经过演练的数据库恢复手册处理，不能把 `migration:revert` 当作生产自动回滚。

## 已验证范围

2026-10-28 的本地验收包括：生产依赖审计 0 漏洞；lint、typecheck、build；全部 CI 测试；迁移重复执行与最新迁移回滚/重放；三类镜像实际构建；API 镜像内生产迁移命令；镜像非 root 用户；Web/Admin 健康检查；隔离 Compose 栈从空数据库执行 27 条迁移并使五个服务全部健康。

尚未完成真实生产主机发布、外部 TLS、GHCR 首次发布权限验证、备份/PITR 恢复演练、Alertmanager 生产路由、容量压测和多机编排，因此这些能力不能标记为生产验收完成。
