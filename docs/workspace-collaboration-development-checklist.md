# 工作区邀请与所有权转移开发清单

更新日期：2026-10-24

## 本阶段结论

工作区协作第一阶段已经打通邀请创建、查询、重发、撤销、接受和所有权转移。邀请令牌只在创建或重发响应中出现一次，数据库只保存 SHA-256 哈希；邀请七天有效、绑定邮箱且只允许接受一次。接受接口使用固定 URL 并通过 POST body 接收令牌，避免令牌进入访问日志。

当前尚未接入事务邮件服务，Console 会明确提示管理员复制邀请链接并通过可信渠道发送。邮件投递、成员分页搜索和 Owner 二次确认属于后续阶段。

## 已交付接口

| 接口 | 权限 | 行为 |
| --- | --- | --- |
| `GET /api/workspaces/current/invitations` | Owner/Admin | 查询当前工作区最近 200 条邀请元数据，不返回令牌 |
| `POST /api/workspaces/current/invitations` | Owner/Admin | 创建七天有效的一次性邀请；Admin 不能邀请 Admin |
| `POST /api/workspaces/current/invitations/:id/resend` | Owner/Admin | 轮换令牌并重置有效期，旧令牌立即失效 |
| `DELETE /api/workspaces/current/invitations/:id` | Owner/Admin | 撤销待接受或已过期邀请 |
| `POST /api/workspace-invitations/accept` | 登录用户 | 校验令牌、邮箱、过期时间和重放状态后加入工作区 |
| `POST /api/workspaces/current/transfer-ownership` | Owner | 在同一事务中将旧 Owner 降为 Admin、目标成员提升为 Owner |

## 数据与安全约束

- `workspace_invitations` 保存邮箱、角色、状态、令牌哈希、邀请人、接受人及生命周期时间。
- 同一工作区与邮箱最多存在一个 `pending` 邀请；每个工作区最多保留 100 个待接受邀请。
- 数据库通过部分唯一索引保证每个工作区只有一个有效 Owner。
- 创建、重发、撤销、接受和所有权转移都进入追加式审计日志；不记录请求正文或邀请令牌。
- 所有权转移锁定工作区与成员记录，避免并发产生双 Owner 或无 Owner。

## 前端交付

- Console“成员权限”新增邀请弹窗、一次性链接复制、邀请状态列表、重发和撤销。
- Owner 可在成员列表中发起所有权转移，成功后重新加载工作区角色与全部工作区缓存。
- 新增 `/workspace-invitations/:token` 接受页面；未登录用户会先登录并回到原邀请页面。
- 按钮继续使用控制台统一的 `#DCE7DE` 底色。

## 验收

- PostgreSQL 集成测试覆盖邮箱绑定、令牌不明文存储、重复邀请、错误邮箱、接受、重放、撤销、过期、重发和所有权转移。
- HTTP 集成测试覆盖权限拒绝、422 参数校验、邀请接受、重放拒绝、Owner 转移和审计留痕。
- 全仓 typecheck、lint、build 通过；Console 成员页已在真实本地接口下完成桌面浏览器检查。

## 下一步

1. 接入邮件 Worker 和可观测投递状态，邮件只包含 Web 邀请地址。
2. 成员和邀请改为游标分页与服务端搜索。
3. 所有权转移增加近期重新认证或 MFA，并发送双向通知。
4. 用户、工作区与默认项目创建合并为单事务。
5. 开始 Project CRUD，并让 API Key、路由、日志和用量绑定 `project_id`。
