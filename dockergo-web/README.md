# DockerGo Web

DockerGo 的应用市场前端。项目使用 React、TypeScript 和 Vite，提供应用安装配置、iStoreOS 系统任务日志，以及通过 DockerGo JSON API 获取真实 Docker 容器的已安装应用视图。

## 开发

```bash
pnpm install
pnpm dev
```

开发与预览服务监听 `0.0.0.0:37001`，本机可通过 `http://localhost:37001` 访问。

若需要在独立开发服务中连接 iStoreOS，请复制 `.env.example` 为 `.env.local` 并填写路由器地址。本地配置已被 Git 忽略。启动开发服务后，先通过 `http://localhost:37001/cgi-bin/luci/` 登录 LuCI，使代理后的 JSON API 获得登录会话。

## 页面路由与标签筛选

页面使用 History 路径路由，不使用 Hash 或查询参数保存视图和标签。LuCI 中的基础路径是 `/cgi-bin/luci/admin/services/dockergo`，独立开发时基础路径为空：

- `<基础路径>/installed`：已安装，访问 DockerGo 根页面时也默认显示此视图。
- `<基础路径>/market`：应用市场，显示全部应用。
- `<基础路径>/market/tag/t-576562`：按 `Web` 标签精确筛选；标签使用带 `t-` 前缀的 UTF-8 十六进制路径标识，页面仍显示原始标签。

切换视图或标签会更新 URL，刷新后保留当前选择，并支持浏览器前进、后退和复制链接。标签从应用目录的 `tags` 动态去重生成，“全部”清除筛选；链接中的标签不存在时显示空结果，可切回“全部”。切换视图或标签不会重新请求目录和容器列表，主动刷新或容器操作后仍按原逻辑更新数据。

插件菜单注册了已安装、市场及市场标签的页面入口，均加载同一个前端并继承 LuCI 登录校验；标签包含在实际请求路径中，重新登录后 LuCI 可重定向回完整路径。ASCII 标签标识可避免 LuCI 登录重定向过滤中文或特殊字符路径段，也能正确处理斜杠和点号标签。`window.DockerGoConfig.pageBase` 由挂载页面注入，避免与 LuCI API 路径混淆。静态部署到其他服务器时需为这些路径配置前端页面回退。

## 检查与构建

```bash
pnpm check
pnpm build
```

构建 LuCI 插件携带的前端资源：

```bash
../build.sh
```

也可以在仓库根目录运行 `./build.sh`。脚本可从任意工作目录调用，要求已安装 Node.js 和 `package.json` 指定的 pnpm（当前为 `10.20.0`）；脚本按锁文件安装依赖，再执行类型检查和生产构建，将结果写入 `luci-app-dockergo/htdocs/luci-static/resources/dockergo/app`。构建会清理并重新生成该资源目录，不编译 IPK/APK，也不上传设备。

依赖已安装时，可在本目录直接执行 `pnpm build:luci`。

## 项目结构

- `src/components`：页面组件和安装弹窗
- `src/api`：DockerGo HTTP JSON API 客户端
- `src/data`：应用目录数据
- `src/hooks`：安装任务提交和 Docker 容器查询状态
- `src/types.ts`：共享领域类型
- `src/styles.css`：全局设计令牌、组件样式和响应式规则

## 重构说明

该项目由 Figma Make 导出原型重构而来。新项目不依赖 Figma 的运行时、预览插件、配置文件或 HTML 注入占位符，使用标准 Vite 配置独立运行。

部署到 iStoreOS 时，前端由 `luci-app-dockergo` 直接挂载到 LuCI 页面，并通过同源、受 LuCI 登录保护的 DockerGo JSON API 访问容器数据和生命周期操作。
