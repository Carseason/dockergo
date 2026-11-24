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

页面使用 History 路径路由，只保存已安装 / 应用市场视图，不使用 Hash。LuCI 中的基础路径是 `/cgi-bin/luci/admin/dockergo`，独立开发时基础路径为空。菜单位于 LuCI 一级导航，旧 `/admin/services/dockergo` 页面链接仍兼容，API 前缀保持不变：

- `<基础路径>/installed`：已安装，访问 DockerGo 根页面时也默认显示此视图。
- `<基础路径>/market`：应用市场，显示全部应用。

切换视图会更新 URL，刷新后保留当前视图，并支持浏览器前进、后退和复制链接。标签从应用目录的 `tags` 动态去重生成，只保存在当前页面内存中，不写入 URL、浏览器历史或存储，刷新或重新登录后恢复“全部”。选择标签不改变 URL，“全部”清除筛选。切换视图或标签不会重新请求目录和容器列表，主动刷新或容器操作后仍按原逻辑更新数据。

插件的 Lua Controller 统一注册 DockerGo 菜单、已安装和市场页面入口，不再使用独立菜单 JSON。页面均加载同一个前端并继承 LuCI 登录校验；重新登录后 LuCI 可返回对应视图。为兼容旧链接，市场子路径仍可进入页面，但前端会丢弃旧标签并用 `replaceState` 将 URL 规范为 `/market`，不新增历史记录。`window.DockerGoConfig.pageBase` 由挂载页面注入，避免与 LuCI API 路径混淆。静态部署到其他服务器时需为这些路径配置前端页面回退。

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

前端构建不转换 `datas/apps.yaml` 或改写 `datas/apps.json`。修改应用目录后，在仓库根目录单独运行 `./generate-apps.sh`（在本目录则运行 `../generate-apps.sh`）；脚本按锁文件安装依赖，仅生成 CDN 发布用的 JSON，不构建网页或上传 CDN。依赖已安装时也可直接执行 `pnpm run data:generate`。

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
