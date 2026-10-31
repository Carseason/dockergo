# DockerGo Web 项目分析

## 原型定位

原型是一个面向 Docker 自托管用户的单页应用市场，主要路径为：

1. 搜索或按分类浏览应用。
2. 选择应用并配置端口、数据目录和自动化选项。
3. 查看模拟安装进度与日志。
4. 在已安装视图中确认运行中的应用。

## 原项目问题

- `App.tsx` 同时承担目录数据、筛选、安装状态、计时器副作用和全部页面结构，修改风险较高。
- `vite.config.ts` 包含大量 Figma Make 专用插件，标准 Vite 环境无法脱离 `.figma` 配置独立使用。
- HTML 标题、语言和脚本位置依赖 Figma 注入占位符。
- 图标由组件内手写 SVG 路径维护，不利于统一样式和无障碍标注。
- 应用默认端口统一为 `80`，与 PostgreSQL、Redis、MinIO 等应用的常见端口不符。
- 搜索框展示快捷键但未实现快捷键行为，主视觉的“浏览全部应用”也没有实际滚动反馈。

## 新项目结构

- `data/apps.ts` 保存应用目录及默认端口。
- `types.ts` 定义应用、视图、安装阶段和配置模型。
- `hooks/useInstaller.ts` 管理安装状态、部署日志和定时器清理。
- `hooks/useContainers.ts` 通过插件 JSON API 加载真实 Docker 容器。
- `api/dockergo.ts` 封装 DockerGo HTTP JSON API 客户端。
- `components` 按目录、卡片、主视觉、安装弹窗和通知拆分。
- `App.tsx` 只负责页面级筛选、视图切换和组件编排。

## iStoreOS 集成

- `luci-app-dockergo` 提供标准 LuCI 菜单和受登录保护的 HTTP JSON 后端。
- `/admin/services/dockergo/api/containers` 返回全部 Docker 容器。
- 已安装应用视图以接口结果为唯一数据源，不再使用预置容器数据。
- JSON 后端只接受固定容器操作，并严格校验容器 ID。

## Figma 清理范围

新项目已移除以下耦合：

- `.figma` 目录及 Make 脚本。
- Figma 站点配置和 HTML 注入占位符。
- 错误浮层回放、React Refresh 兜底和 Make Kit 插件。
- `FIGMA_PUBLIC_URL`、`FIGMA_DEV_SERVER_HOST` 等环境变量。
- Figma 专用 `AGENTS.md`、`CLAUDE.md` 和项目命名。

原始 `dockergo-web_figma` 目录仅作为迁移输入保留在本地，并由仓库根目录 `.gitignore` 排除，不会进入新项目提交。
