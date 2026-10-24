# Console 与 Admin 组件体系

更新日期：2026-10-24

## 决策

Console 与 Admin 统一使用 Ant Design Vue 4 作为业务组件基础，UnoCSS 继续负责布局、间距和页面级组合样式。`packages/ui` 保存 Nexus 设计令牌、AntDV 主题对象和组件覆盖层，页面目录只保留当前业务场景确实需要的局部样式。

这条边界适用于认证后的产品界面。官网营销页仍可保留定制视觉组件，不要求用业务组件库重写。

## 已接入

- `apps/web` 与 `apps/admin` 已安装 `ant-design-vue@4.2.6`，组件按需导入，避免全量插件进入首包。
- 两个应用根节点统一使用 `ConfigProvider`、中文 locale 和 `nexusAntTheme`。
- `packages/ui/src/antdv-theme.ts` 统一颜色、字号、控件高度、圆角、阴影与动效时长。
- `packages/ui/src/antdv.css` 统一 Input、InputNumber、Select、Button、Table、Form、Modal、Drawer、Checkbox、Switch 与 Pagination 的深绿色外观、弹层和键盘焦点。
- Console 登录、Admin 登录以及 API 密钥、成员邀请、模型配置、路由规则表单已迁移到 AntDV。
- Web 与 Admin 路由已改为动态导入，AntDV 业务组件随对应页面加载。
- 业务空值与组件空值通过 computed 适配，继续保持 API 中 `null` 的领域语义。

## 新代码规则

1. 表单控件、表格、分页、下拉、弹窗、抽屉、日期选择、复选框、开关、提示与消息优先使用 AntDV。
2. 组件必须按需导入；禁止在应用入口使用 `app.use(Antd)` 全量注册。
3. 页面使用 UnoCSS 组织 Grid/Flex、间距和响应式布局；禁止复制 AntDV 内部样式到页面 CSS。
4. 全局视觉调整只修改 `nexusAntTheme` 或 `antdv.css`；页面只允许处理业务布局和该页面特有状态。
5. 不创建只转发全部属性的浅包装组件。只有组件承载 Nexus 业务语义、权限、错误状态或可访问性契约时才进入 `packages/ui`。
6. 表格必须提供 loading、empty、error 和分页状态；窄屏使用横向滚动、固定关键列或卡片视图，不能静默裁掉操作列。
7. Modal/Drawer 必须有明确标题、关闭入口、加载锁定、错误区和提交禁用条件；破坏性操作必须使用 danger 样式并说明影响范围。
8. 所有控件保留可见的键盘焦点，不得用 `outline: none` 移除最终焦点指示。

## 迁移顺序

1. 已完成：两个登录页及 Console 高频配置弹窗。
2. 下一批：Admin 供应商、排行榜、审计和会话筛选表单。
3. 下一批：Console/Admin 数据表迁移到 Table + Pagination，并补移动端策略。
4. 最后：旧页面 CSS 中只服务于原生控件的规则清理；官网定制组件不纳入批量替换。

## 验收

- Console 与 Admin 可独立开发和生产构建。
- 全仓 typecheck、lint 通过。
- 登录、下拉弹层、弹窗、表格和分页在深色背景下对比度一致。
- 桌面与 390px 视口不出现横向页面溢出，弹层可滚动且操作按钮可见。
- 键盘 Tab 顺序、焦点样式、禁用和加载状态清晰。
