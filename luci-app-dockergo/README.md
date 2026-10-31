# luci-app-dockergo

DockerGo 的 iStoreOS/OpenWrt LuCI 插件。插件提供受 LuCI 会话和 ACL 保护的只读 Docker 容器列表接口，并加载 DockerGo React 前端。

## 接口

ubus 对象：`luci.dockergo`

方法：`list`

在路由器终端中可直接验证：

```sh
ubus call luci.dockergo list
```

成功响应示例：

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

- 后端以固定参数执行 Docker CLI，不拼接任何请求数据。
- ACL 只开放 `luci.dockergo.list`，不提供容器控制或命令执行权限。
- 浏览器通过 LuCI 的 `rpc.declare()` 调用接口，沿用当前 LuCI 登录会话。
- Docker Socket 不暴露到网络或浏览器。

## 构建前端资源

在仓库的 `dockergo-web` 目录执行：

```sh
pnpm install
pnpm build:luci
```

生成的文件会写入 `htdocs/luci-static/resources/dockergo/app`，它们是 LuCI 安装包需要携带的运行时资源。

## 构建 IPK/APK

将 `luci-app-dockergo` 放入 OpenWrt SDK 或源码树的 `package` 目录，确保已经更新 LuCI feed，然后通过包构建命令编译。该包依赖 `luci-base`、`docker`、`dockerd` 和 `rpcd-mod-ucode`。
