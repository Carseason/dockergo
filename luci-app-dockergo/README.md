# luci-app-dockergo

DockerGo 的 iStoreOS/OpenWrt LuCI 插件。插件提供受 LuCI 登录保护的独立 HTTP JSON API，并将 DockerGo React 前端直接挂载到 LuCI 页面。

## JSON API

接口前缀：`/cgi-bin/luci/admin/services/dockergo/api`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/catalog` | 获取 `/usr/share/dockergo/catalog.json` 中的应用目录 |
| `GET` | `/files?path=/mnt/...` | 浏览 `/mnt` 下可用的映射目录和文件 |
| `POST` | `/install` | 创建应用安装系统任务并返回任务 ID |
| `GET` | `/containers` | 获取全部 Docker 容器 |
| `GET` | `/inspect?id=<容器 ID>` | 获取指定容器详情 |
| `GET` | `/logs?id=<容器 ID>` | 获取指定容器最近 300 行日志 |
| `POST` | `/control` | 启动、暂停或恢复容器 |
| `POST` | `/remove` | 强制停止并删除指定容器，保留镜像与数据卷 |

应用市场由 `/catalog` 返回的数据渲染。后端仅接受 `schemaVersion` 为 `1`、
应用 ID 唯一且核心字段完整的目录文件；缺失、过大或无法解析的目录会返回明确的 JSON 错误。
仓库中的 `datas/catalog.yaml` 是可编辑目录，`datas/catalog.json` 是对应的 JSON 数据；
插件携带的 `/usr/share/dockergo/catalog.json` 与生成结果保持一致，并由 `/catalog` 接口直接读取。
每个应用必须声明 `version` 字符串，应用市场会在标题旁显示该版本号。
端口项使用 `port` 表示默认宿主机端口、`target` 表示容器端口，并通过 `desc`
向用户说明用途。存储项使用 `target` 表示容器路径，`type` 必须为 `dir` 或
`file`，`desc` 用于说明映射用途；宿主机路径由用户安装时提供，不存入应用目录。
应用仅在声明布尔字段 `autoStart` 时向用户显示自动启动选项，字段值作为默认选择；
未声明该字段的应用不会显示该选项，后端也会强制关闭 Docker 重启策略。

通过应用市场创建的容器使用 `dgo_<应用 ID>_<版本>_<实例 ID>` 命名，并携带
`io.dockergo.managed`、`io.dockergo.app-id`、`io.dockergo.app-version` 和
`io.dockergo.instance-id` 标签。容器列表接口返回这些结构化元数据，前端通过应用 ID
关联目录信息；实例 ID 保证同一应用和版本可以创建多个容器。

`control` 接收 `application/x-www-form-urlencoded` 参数：

- `id`：12 至 64 位十六进制容器 ID。
- `action`：`start`、`pause` 或 `unpause`。
- `token`：当前 LuCI 会话的 CSRF token，由挂载页自动注入。

`remove` 接收同样格式的 `id` 和 `token` 参数。该操作只删除容器，保留镜像和数据卷。

`install` 接收 `appId`、`ports`、`volumes`、`autoStart` 和 `token`。`ports` 与 `volumes` 是 JSON 字符串数组，数量和顺序必须与应用目录中的同名数组一致；存储路径可使用空字符串，表示不创建对应映射。后端只采纳用户可配置值，镜像、容器端口、挂载目标、环境变量和启动命令均重新从应用目录读取。接口通过 `taskd` 启动 `/usr/libexec/dockergo-install`，前端使用系统任务弹窗实时展示安装日志。taskd 实例名固定为 `dockergo`；已有安装任务运行时，重复请求会返回 `409 TASK_BUSY`。

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
      "mounts": "redis-data",
      "managed": true,
      "appId": "redis",
      "appVersion": "7.4.1",
      "instanceId": "a1b2c3d4"
    }
  ],
  "generatedAt": 1793500000
}
```

## 安全边界

- API 位于 LuCI 的 `admin` 路由下，沿用当前 LuCI 登录会话。
- 修改容器状态时必须提交 LuCI CSRF token。
- 后端只执行固定 Docker 命令，容器 ID 和操作类型均经过白名单校验。
- 安装任务只执行固定安装程序；映射路径被限制在 `/docker/apps/` 或 `/mnt/<磁盘>/`，用户输入不会作为 Docker 命令执行。
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

将 `luci-app-dockergo` 放入 OpenWrt SDK 或源码树的 `package` 目录，确保已经更新 LuCI feed，然后通过包构建命令编译。该包依赖 `luci-base`、`luci-compat`、`luci-lib-taskd`、`docker` 和 `dockerd`。
