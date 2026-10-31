# luci-app-dockergo

DockerGo 的 iStoreOS/OpenWrt LuCI 插件。插件提供受 LuCI 登录保护的独立 HTTP JSON API，并将 DockerGo React 前端直接挂载到 LuCI 页面。

## JSON API

接口前缀：`/cgi-bin/luci/admin/services/dockergo/api`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/containers` | 获取全部 Docker 容器 |
| `GET` | `/inspect?id=<容器 ID>` | 获取指定容器详情 |
| `POST` | `/control` | 启动、暂停或恢复容器 |

`control` 接收 `application/x-www-form-urlencoded` 参数：

- `id`：12 至 64 位十六进制容器 ID。
- `action`：`start`、`pause` 或 `unpause`。
- `token`：当前 LuCI 会话的 CSRF token，由挂载页自动注入。

容器列表成功响应示例：

```json
{
  "containers": [
    {
      "id": "8c7...",
      "name": "redis",
      "image": "redis:7",
      "command": "docker-entrypoint.sh redis-server",
      "createdAt": "2026-11-01 10:00:00 +0800 HKT",
      "runningFor": "2 hours ago",
      "ports": "0.0.0.0:6379->6379/tcp",
      "state": "running",
      "status": "Up 2 hours",
      "networks": "bridge",
      "mounts": "redis-data"
    }
  ],
  "generatedAt": 1793500000
}
```

## 安全边界

- API 位于 LuCI 的 `admin` 路由下，沿用当前 LuCI 登录会话。
- 修改容器状态时必须提交 LuCI CSRF token。
- 后端只执行固定 Docker 命令，容器 ID 和操作类型均经过白名单校验。
- 前端只通过同源 HTTP JSON API 访问数据，不调用 ubus，也不暴露 Docker Socket。
- 修改容器状态的接口只接受 `POST` 请求。

## 构建前端资源

在仓库的 `dockergo-web` 目录执行：

```sh
pnpm install
pnpm build:luci
```

生成的文件会写入 `htdocs/luci-static/resources/dockergo/app`，它们是 LuCI 安装包需要携带的运行时资源。

## 构建 IPK/APK

将 `luci-app-dockergo` 放入 OpenWrt SDK 或源码树的 `package` 目录，确保已经更新 LuCI feed，然后通过包构建命令编译。该包依赖 `luci-base`、`luci-compat`、`docker` 和 `dockerd`。
