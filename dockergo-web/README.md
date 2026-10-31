# DockerGo Web

DockerGo 的应用市场前端。项目使用 React、TypeScript 和 Vite，提供应用搜索、分类筛选、安装配置、部署进度，以及通过 DockerGo JSON API 获取真实 Docker 容器的已安装应用视图。

## 开发

```bash
pnpm install
pnpm dev
```

开发与预览服务监听 `0.0.0.0:37001`，本机可通过 `http://localhost:37001` 访问。

若需要在独立开发服务中连接 iStoreOS，请复制 `.env.example` 为 `.env.local` 并填写路由器地址。本地配置已被 Git 忽略。启动开发服务后，先通过 `http://localhost:37001/cgi-bin/luci/` 登录 LuCI，使代理后的 JSON API 获得登录会话。

## 检查与构建

```bash
pnpm check
pnpm build
```

构建 LuCI 插件携带的前端资源：

```bash
pnpm build:luci
```

## 项目结构

- `src/components`：页面组件和安装弹窗
- `src/api`：DockerGo HTTP JSON API 客户端
- `src/data`：应用目录数据
- `src/hooks`：安装流程和 Docker 容器查询状态
- `src/types.ts`：共享领域类型
- `src/styles.css`：全局设计令牌、组件样式和响应式规则

## 重构说明

该项目由 Figma Make 导出原型重构而来。新项目不依赖 Figma 的运行时、预览插件、配置文件或 HTML 注入占位符，使用标准 Vite 配置独立运行。

部署到 iStoreOS 时，前端由 `luci-app-dockergo` 直接挂载到 LuCI 页面，并通过同源、受 LuCI 登录保护的 DockerGo JSON API 访问容器数据和生命周期操作。
