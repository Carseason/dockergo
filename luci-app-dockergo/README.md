# luci-app-dockergo

DockerGo 的 iStoreOS/OpenWrt LuCI 插件。插件提供受 LuCI 登录保护的独立 HTTP JSON API，并将 DockerGo React 前端直接挂载到 LuCI 页面。

应用市场字段、安装请求参数、默认值和当前限制详见 [参数说明](../docs/parameters.md)。

前端使用 History 路径路由保存已安装 / 应用市场视图，不使用 Hash。菜单注册 `/admin/services/dockergo/installed`、`/admin/services/dockergo/market`，均加载同一个视图并继承 LuCI 登录校验；刷新、重新登录和前进后退保留对应视图。市场标签从目录 `tags` 动态生成，只保存在页面内存中，选择时不改变 URL，刷新后恢复“全部”。旧市场子路径仍可加载前端，随后规范为市场路径并清除旧标签。

## JSON API

接口前缀：`/cgi-bin/luci/admin/services/dockergo/api`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/apps.json` | 获取 `/usr/share/dockergo/apps.json` 中的应用目录 |
| `GET` | `/files?path=/mnt/...` | 浏览 `/mnt` 下可用的映射目录和文件 |
| `POST` | `/install` | 创建应用安装系统任务并返回任务 ID |
| `GET` | `/containers` | 获取全部 Docker 容器 |
| `GET` | `/inspect?id=<容器 ID>` | 获取指定容器详情 |
| `GET` | `/logs?id=<容器 ID>` | 获取指定容器最近 300 行日志 |
| `POST` | `/control` | 启动、暂停或恢复容器 |
| `POST` | `/remove` | 强制停止并删除指定容器，保留镜像与数据卷 |

应用市场由 `/apps.json` 返回的数据渲染。后端仅接受 `schemaVersion` 为 `1`、
应用 ID 唯一且核心字段完整的目录文件；缺失、过大或无法解析的目录会返回明确的 JSON 错误。
仓库中的 `datas/apps.yaml` 是可编辑目录，`datas/apps.json` 是对应的 JSON 数据；
插件携带的 `/usr/share/dockergo/apps.json` 与生成结果保持一致，并由 `/apps.json` 接口直接读取。
每个应用必须声明 `version` 字符串，应用市场会在标题旁显示该版本号。
端口项使用 `port` 表示默认宿主机端口、`target` 表示容器端口，并通过 `desc`
向用户说明用途。存储项使用 `target` 表示容器路径，`type` 必须为 `dir` 或
`file`，`desc` 用于说明映射用途；宿主机路径由用户安装时提供，不存入应用目录。
应用使用 `d`（默认 `true`）控制后台运行，`rm`（默认 `false`）控制退出后自动清理，
`restart`（默认 `"no"`）控制重启策略，支持 `no`、`always`、`unless-stopped`、`on-failure`。
`rm: false` 时表单提供重启策略下拉框；`rm: true` 时隐藏该选项并固定为 `no`，后端拒绝冲突组合。
旧字段 `mode`、`autoStart` 已移除，继续声明会导致目录校验失败。

例如 gallery-dl 使用 `d: false`、`rm: true`、`restart: "no"`，通过附加模式等待本次命令结束，
输出写入系统任务日志，退出后自动清理容器。Nginx 使用 `d: true`、`rm: false`、`restart: unless-stopped`。
`inputs` 统一声明文本运行参数，在 `command` 字符串数组中用完整参数 `{{参数 ID}}` 引用。
存储项可用 `required: true` 要求必须提供映射路径，自动清理应用应映射需要保留的输出。

新建容器使用 Docker 默认 `bridge` 网络，运行命令不指定 `--network`，不再创建专用网络。
升级不会迁移已有容器的网络，也不会删除已有网络。

创建弹窗提供默认勾选的“立即启动”，勾选时预览与后端使用 `docker run`，取消时使用 `docker create` 且不添加 `--detach`。实例 ID 在切换时保持不变。镜像拉取、容器查询与操作也使用 `docker` 简写，通过服务运行环境的 `PATH` 查找命令。

通过应用市场创建的容器使用 `dgo_<应用 ID>_<版本>_<8位实例 ID>` 命名，不添加或读取 DockerGo 标签。
列表接口从名称解析 `managed`、`appId`、`appVersion`、`instanceId`，前端据此筛选和关联目录信息。
ID 或版本包含下划线时优先使用唯一的目录 ID 匹配，存在歧义则保留卡片但不关联应用，详见参数文档。
实例 ID 在打开创建弹窗时由前端生成，修改配置和失败重试时不变，预览直接显示完整容器名称。
安装请求必须提交 `instanceId`，后端校验 8 位小写十六进制格式并自行拼接名称；同名容器存在时返回 `409 CONTAINER_NAME_CONFLICT`，不会静默更换 ID。
同一应用和版本可以创建多个实例；已有容器不重建，旧标签不修改。

已安装卡片在容器记录版本与市场版本不一致时，在原版本位置显示 `v已安装版本（有 市场版本 版本）`。提醒只比较目录版本，不检测镜像摘要，也不自动重建容器。

`control` 接收 `application/x-www-form-urlencoded` 参数：

- `id`：12 至 64 位十六进制容器 ID。
- `action`：`start`、`pause` 或 `unpause`。
- `token`：当前 LuCI 会话的 CSRF token，由挂载页自动注入。

`remove` 接收同样格式的 `id` 和 `token` 参数。该操作只删除容器，保留镜像和数据卷。

`install` 接收 `appId`、`instanceId`、`startNow`、`ports`、`volumes`、`inputs`、`restart` 和 `token`。`startNow` 只接受 `"1"` / `"0"`，默认 `"1"`；为 `"0"` 时仅创建容器。立即运行时 `d: true` 添加 `--detach`，`d: false` 等待本次运行结束；已安装容器再次启动仍使用 `docker start`。`rm: true` 的容器未启动前不会自动清理。`inputs` 是键值均为字符串的 JSON 对象，只接受应用目录中声明的参数。`restart` 默认使用目录策略。`ports` 与 `volumes` 是 JSON 字符串数组，数量和顺序必须与应用目录一致；非必填存储路径可用空字符串跳过。后端从目录读取固定镜像、`d`、`rm`、容器端口、挂载目标、环境变量和命令模板。接口通过 `taskd` 启动 `/usr/libexec/dockergo-install`，前端使用系统任务弹窗显示部署输出。后台启动成功不代表应用执行完成。系统任务名固定为 `dockergo`，忙时返回 `409 TASK_BUSY`。自动清理后应查看系统任务日志；已有容器不会自动迁移或删除。

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

在仓库根目录执行：

```sh
./build.sh
```

脚本要求已安装 Node.js 和项目指定的 pnpm，会按锁文件安装依赖、检查 TypeScript 类型，再构建前端。脚本可通过完整路径从任意工作目录调用。

生成的文件会写入本插件的 `htdocs/luci-static/resources/dockergo/app`，它们是 LuCI 安装包需要携带的运行时资源。构建会重新生成该目录，不编译 IPK/APK，也不上传设备。

## 构建 IPK/APK

将 `luci-app-dockergo` 放入 OpenWrt SDK 或源码树的 `package` 目录，确保已经更新 LuCI feed，然后通过包构建命令编译。该包依赖 `luci-base`、`luci-compat`、`luci-lib-taskd`、`docker` 和 `dockerd`。
