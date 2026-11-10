# DockerGo 参数说明

本文对照当前应用目录、前端安装表单、LuCI API 和安装执行器整理，描述已实现的行为。主要面向应用市场条目维护者，同时说明安装请求与开发配置的区别。

## 1. 数据文件与读取流程

| 文件或接口 | 用途 |
| --- | --- |
| `datas/catalog.yaml` | 人工维护的应用市场目录 |
| `datas/catalog.json` | YAML 对应的 JSON 数据 |
| `luci-app-dockergo/root/usr/share/dockergo/catalog.json` | 插件携带的运行时 JSON，安装后位于 `/usr/share/dockergo/catalog.json` |
| `GET /cgi-bin/luci/admin/services/dockergo/api/catalog` | 后端读取运行时 JSON，校验后返回给前端 |

前端不直接读取 YAML，也不直接读取仓库中的 `datas/catalog.json`。修改 YAML 后，需要生成 JSON、同步插件内的 JSON，再部署运行时文件。当前 `package.json` 没有提供 YAML 转 JSON 的生成命令；`build:luci` 只构建前端资源，不转换目录数据。

应用目录文件必须非空，且不超过 1 MiB。根结构如下：

```json
{
  "schemaVersion": 1,
  "apps": []
}
```

| 根字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `schemaVersion` | 整数 | 是 | 当前只支持 `1`，表示目录结构版本，不是应用版本 |
| `apps` | 应用对象数组 | 是 | 每个元素是一条可安装或可运行的应用，应用 ID 不可重复 |

## 2. 应用一级字段

配置直接放在应用对象一级，不存在 `install` 配置层。

| 字段 | 类型 | 必填 / 默认值 | 含义与约束 |
| --- | --- | --- | --- |
| `id` | 字符串 | 必填 | 稳定的应用标识，用于安装请求、容器命名和关联目录信息。安装时要求匹配 `^[a-z0-9][a-z0-9._-]*$`，长度 1–64，在目录中唯一 |
| `title` | 字符串 | 必填 | 非空，市场卡片和配置弹窗的展示标题 |
| `version` | 字符串 | 必填 | 匹配 `^[A-Za-z0-9][A-Za-z0-9._-]*$`，长度 1–64；展示在卡片标题旁，并写入容器名称和标签 |
| `description` | 字符串 | 必填 | 市场卡片简介；当前允许空字符串，建议填写实际用途 |
| `tags` | 字符串数组 | 必填 | 展示在简介下方；无标签时填 `[]` |
| `image` | 字符串 | 必填 | 非空 Docker 镜像引用，例如 `nginx:1.30.5-alpine`；安装时执行镜像拉取 |
| `mode` | 字符串 | 默认 `service` | 只支持 `service` 和 `task`，详见下一节 |
| `autoStart` | 布尔值 | 可省略 | 仅服务可声明；是否声明决定是否显示“自动启动”选项，字段值决定默认勾选状态 |
| `ports` | 端口对象数组 | 默认 `[]` | 按数组数量和顺序渲染端口配置；没有端口就省略或填 `[]` |
| `volumes` | 存储对象数组 | 默认 `[]` | 按数组数量和顺序渲染目录或文件映射 |
| `environment` | 字符串键值对象 | 默认 `{}` | 固定环境变量，当前没有供用户编辑环境变量的表单 |
| `command` | 字符串数组 | 默认 `[]` | 放在镜像名之后的命令参数，可引用 task 的文本输入 |
| `inputs` | 输入对象数组 | 默认 `[]` | 只有 task 可以声明非空数组；统一渲染为文本输入框 |

`version` 不会自动改写 `image` 的标签。例如只修改 `version` 而不修改 `image`，实际拉取的镜像仍由 `image` 决定。目录版本变化也不会更新已创建的容器。

表中的字段是当前维护格式；不要依赖后端对不规范数据的宽松接受。例如应用 ID 的字符限制在安装阶段检查，`tags` 的每个元素当前没有经过后端严格字符串校验。写目录时仍应遵守表格中的类型和约束。

## 3. 运行模式和启动选项

| 行为 | `service` | `task` |
| --- | --- | --- |
| 典型应用 | Nginx 等持续运行的服务 | gallery-dl 等执行后退出的工具 |
| 市场按钮 | 安装 | 运行 |
| “立即启动”选项 | 显示，默认勾选 | 隐藏，始终立即运行 |
| `autoStart` | 可声明 | 禁止声明，包括 `false` |
| 非空 `inputs` | 不支持 | 支持 |
| Docker 重启策略 | 自动启动勾选时 `unless-stopped`，否则 `no` | 固定 `no` |
| 首次执行方式 | 创建后按选择后台启动 | 创建后 `docker container start --attach`，等待命令结束，输出进入系统任务日志 |
| 命令退出后 | 保留容器 | 保留容器，可以查看日志、再次运行或卸载 |

服务的 `autoStart` 有三种含义：

| 目录配置 | 安装表单 | 后端行为 |
| --- | --- | --- |
| 省略 `autoStart` | 不显示自动启动选项 | 强制使用 `restart=no` |
| `autoStart: false` | 显示，默认不勾选 | 根据用户最终选择设置重启策略 |
| `autoStart: true` | 显示，默认勾选 | 根据用户最终选择设置重启策略 |

`startNow` 是安装请求字段，不是应用目录字段。服务的“立即启动”与“自动启动”分别控制本次启动和 Docker 重启策略。

task 首次创建会占用固定名称为 `dockergo` 的系统任务，直到容器命令结束。已安装卡片上的“再次运行”调用普通容器启动接口，复用原有命令、URL、环境变量和挂载，不会重新询问参数，也不会走首次安装的系统任务日志流程。需要更换 URL 时，应从市场重新运行，创建新的实例。

## 4. ports：端口映射

```json
[
  { "port": 8080, "target": 80, "desc": "默认端口" }
]
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `port` | 整数 | 是 | 默认宿主机端口，范围 1–65535，用户安装时可修改 |
| `target` | 整数 | 是 | 容器端口，范围 1–65535，在同一应用中不可重复；表单固定不可修改 |
| `desc` | 字符串 | 是 | 非空，作为端口输入框说明，例如“默认端口” |

当前统一生成 `0.0.0.0:<用户端口>:<target>/tcp`。不支持配置 UDP、监听 IP 或通过 `web` 指定网页端口。用户提交的宿主机端口在同一次安装中也不能重复；是否与设备其他进程冲突，由实际启动结果决定。

未声明端口的应用不会生成端口输入框，也不会自动补充默认端口。已安装卡片的端口链接来自真实容器信息，当前统一按 HTTP 生成，不能据此判断服务是否实际提供网页。

## 5. volumes：目录和文件映射

```json
[
  { "target": "/gallery-dl", "type": "dir", "desc": "下载目录", "required": true },
  { "target": "/etc/gallery-dl.conf", "type": "file", "desc": "配置文件" }
]
```

| 字段 | 类型 | 必填 / 默认值 | 说明 |
| --- | --- | --- | --- |
| `target` | 字符串 | 必填 | 容器内绝对路径，以 `/` 开头，在同一应用中不可重复；用户不可修改 |
| `type` | 字符串 | 必填 | 只支持 `dir` 或 `file` |
| `desc` | 字符串 | 必填 | 非空，作为映射输入框的简介 |
| `required` | 布尔值 | 默认 `false` | 为 `true` 时必须填写宿主机映射路径 |

宿主机路径不写在目录里，所有映射输入框初始为空，也没有自动补充的路径前缀。非必填项留空时不创建该挂载；必填项留空会被拒绝。

允许手动输入 `/docker/apps/<路径>` 或 `/mnt/<磁盘>/<路径>`，例如 `/mnt/sda1/gallery`。安装接口限制路径长度不超过 240 字节，仅接受现有实现允许的 ASCII 字母、数字、点、下划线、连字符及目录分隔符；不接受空格、中文、连续 `//` 或任何 `..` 子串。目录选择器只浏览 `/mnt` 下已存在的普通目录和文件，过滤符号链接，名称必须以字母或数字开头；它与手动输入的可用范围并不完全相同。

安装执行器对两种类型的处理：

- `dir`：执行 `mkdir -p` 创建宿主机目录，再绑定到 `target`。
- `file`：创建父目录；文件不存在时创建空文件，已存在时要求是普通文件。不会生成默认配置内容，请按应用需要预先准备文件。

当前挂载统一为默认读写绑定，不提供只读、权限、用户 ID 或挂载传播配置。卸载容器不会删除宿主机上的映射数据。

## 6. environment：固定环境变量

```json
{
  "TZ": "Asia/Shanghai",
  "PUID": "1000"
}
```

键必须匹配 `^[A-Za-z_][A-Za-z0-9_]*$`，值必须是字符串，数字和布尔值也要用引号包裹。安装时转为 `--env KEY=VALUE`；用户当前不能在安装表单中修改。

目录内容由 `/catalog` 返回给前端，环境变量不要包含真实密码、Token 等私密值。`environment` 的键值格式当前在安装阶段检查。

## 7. inputs 与 command：任务文本参数

`inputs` 描述表单，`command` 决定命令参数顺序。当前统一使用文本输入，没有 `type` 字段或多种输入控件。

| inputs 元素字段 | 类型 | 必填 / 默认值 | 说明 |
| --- | --- | --- | --- |
| `id` | 字符串 | 必填 | 匹配 `^[a-z][a-z0-9_-]*$`，长度 1–64，在应用内唯一 |
| `title` | 字符串 | 必填 | 非空，输入框标签 |
| `required` | 布尔值 | 默认 `false` | 为 `true` 时，输入必须至少包含一个非空白字符 |
| `placeholder` | 字符串 | 默认空字符串 | 输入提示，不是默认值，不会作为提交值 |

每个输入值初始为空，前端最多允许 2048 个字符，后端限制为 2048 字节，并拒绝 NUL、ASCII 控制字符和 DEL。后端只接受已声明的输入 ID，不进行 URL 格式或站点可用性校验。

```json
{
  "inputs": [
    { "id": "url", "title": "下载地址", "required": true, "placeholder": "https://example.com/album" }
  ],
  "command": ["--directory", "/gallery-dl", "{{url}}"]
}
```

`command` 必须是字符串数组，每个元素是一个独立参数。占位符必须占满整个元素，例如 `"{{url}}"`；`"--url={{url}}"` 不受支持。占位符只能引用已声明的输入，每个输入必须至少被命令引用一次。可选输入留空时会替换为一个空字符串参数，不会自动删除参数或前面的选项。

执行器对每个参数分别进行 shell 引号处理，用户输入不会作为 shell 脚本执行。`command` 会放在镜像名后，由 Docker 按镜像的 ENTRYPOINT/CMD 规则处理；它不设置 ENTRYPOINT，也不自动调用 shell。对于当前 gallery-dl 镜像，镜像自身的入口为 `gallery-dl`，所以数组只需填写其参数。未配置 `command` 时沿用镜像默认命令。

## 8. 当前目录示例

以下是当前 `datas/catalog.yaml` 的两类应用；版本和镜像值以该文件的后续修改为准。

```yaml
schemaVersion: 1
apps:
  - id: nginx
    title: Nginx
    version: "1.30.5"
    description: 高性能 HTTP 服务器与反向代理服务器
    tags: [网络, Web, 反向代理]
    image: "nginx:1.30.5-alpine"
    autoStart: true
    ports:
      - port: 8080
        target: 80
        desc: 默认端口

  - id: gallery-dl
    title: gallery-dl
    version: "1.32.19"
    description: 支持多个图片与媒体站点的命令行下载工具
    tags: [下载, 图片, 媒体]
    image: "ghcr.io/mikf/gallery-dl:v1.32.19"
    mode: task
    inputs:
      - id: url
        title: 下载地址
        required: true
        placeholder: "https://example.com/album"
    command: ["--directory", "/gallery-dl", "{{url}}"]
    volumes:
      - target: /gallery-dl
        type: dir
        desc: 下载目录
        required: true
      - target: /etc/gallery-dl.conf
        type: file
        desc: 配置文件
```

## 9. 安装请求参数

接口为 `POST /cgi-bin/luci/admin/services/dockergo/api/install`，请求类型为 `application/x-www-form-urlencoded`，沿用 LuCI 登录会话并提交 CSRF token。

| 表单字段 | 传输形式 | 规则 |
| --- | --- | --- |
| `appId` | 字符串 | 已存在的目录应用 ID |
| `ports` | JSON 字符串数组 | 必须提交，数量和顺序与目录 `ports` 一致，例如 `["8080"]`；没有端口时传 `[]` |
| `volumes` | JSON 字符串数组 | 必须提交，数量和顺序与目录 `volumes` 一致；每项是宿主机路径，空字符串跳过非必填项 |
| `inputs` | JSON 字符串键值对象 | 默认 `{}`；只允许声明过的输入，满足必填限制 |
| `startNow` | `"1"` 或 `"0"` | 服务默认 `"1"`；任务强制立即运行。提供其他值会被拒绝 |
| `autoStart` | `"1"` 或 `"0"` | 只有服务且目录声明了 `autoStart` 时，`"1"` 才启用重启策略；其他情况关闭 |
| `token` | 字符串 | 当前 LuCI 会话 CSRF token，由挂载页面注入 |

注意：目录中的 `ports`/`volumes` 是对象数组，请求中的同名字段是用户值的字符串数组，不能直接照搬目录对象。请求不接受用户覆盖镜像、容器端口、挂载目标、环境变量和命令模板，后端会重新读取目录。

例如 gallery-dl 的表单字段值（下表尚未做 URL 编码）：

| 字段 | 值 |
| --- | --- |
| `appId` | `gallery-dl` |
| `ports` | `[]` |
| `volumes` | `["/mnt/sda1/gallery", ""]` |
| `inputs` | `{"url":"https://example.com/album"}` |
| `startNow` | `1` |
| `autoStart` | `0` |
| `token` | 当前会话值 |

提交成功返回 HTTP 202 和 `success`、`taskId`、`containerName`，只表示任务已创建，不表示安装或命令已经完成。`taskId` 固定为 `dockergo`，已有任务运行时返回 HTTP 409 / `TASK_BUSY`；运行结果通过系统任务日志和退出码判断。

## 10. 容器标识与其他接口参数

容器名称由系统生成：`dgo_<id>_<version>_<8位实例ID>`。同一应用可创建多个实例，不提供自定义容器名字段。新建容器携带：

| Docker 标签 | 值 |
| --- | --- |
| `io.dockergo.managed` | `true` |
| `io.dockergo.app-id` | 应用 `id` |
| `io.dockergo.app-version` | 应用 `version` |
| `io.dockergo.instance-id` | 实例 ID |
| `io.dockergo.mode` | `service` 或 `task` |

容器列表接口返回全部容器，前端“已安装”按 `managed` 为真或存在 `appId` 筛选，并通过 `appId` 关联市场信息；仅手动把容器名改为 `dgo_` 前缀不会自动成为受管应用。

其他接口共用 `/cgi-bin/luci/admin/services/dockergo/api` 前缀：

| 方法与路径 | 参数 | 当前行为 |
| --- | --- | --- |
| `GET /catalog` | 无 | 返回目录，结构版本固定为 1 |
| `GET /containers` | 无 | 返回全部 Docker 容器和 DockerGo 标签元数据 |
| `GET /files` | `path`，默认 `/mnt` | 返回可浏览目录和文件，类型字段为 `directory` / `file`；这是接口返回类型，不是目录 `volumes.type` |
| `GET /inspect` | `id` | 返回容器状态、端口、挂载、命令和网络等详情 |
| `GET /logs` | `id` | 返回最近 300 行带时间戳的容器日志，不是持续订阅 |
| `POST /control` | `id`、`action`、`token` | `action` 仅支持 `start`、`pause`、`unpause` |
| `POST /remove` | `id`、`token` | 强制停止并删除容器，保留镜像和映射数据 |

以上容器 `id` 是 12–64 位小写十六进制 Docker ID，不是市场应用 `id` 或容器名称。

## 11. 固定行为与开发配置

以下是程序当前的固定行为，不是可写入应用目录的字段：专用网络 `dockergo_default`；自动拉取镜像；端口使用 TCP 并监听 `0.0.0.0`；挂载默认读写；系统任务名称 `dockergo`；临时安装配置保存在 `/var/run/dockergo` 并由执行器读取后删除。目录不支持自动更新、特权模式、自定义网络、资源限制、只读挂载、任务超时或运行后自动删除容器等设置。

开发环境参数与目录字段分开配置：

| 参数 | 来源 | 用途 |
| --- | --- | --- |
| `DOCKERGO_ROUTER_URL` | Vite 环境变量 | 将开发服务的 `/cgi-bin/luci` 请求代理到路由器 |
| `VITE_DOCKERGO_API_URL` | 前端构建环境变量 | API 前缀；默认 `/cgi-bin/luci/admin/services/dockergo/api` |
| `VITE_DOCKERGO_CSRF_TOKEN` | 前端构建环境变量 | 独立开发时使用的会话 CSRF token；不要提交真实值 |
| `window.DockerGoConfig.apiBase` | LuCI 挂载页面注入 | 优先于 `VITE_DOCKERGO_API_URL` 的 API 前缀 |
| `window.DockerGoConfig.csrfToken` | LuCI 挂载页面注入 | 优先于环境变量的会话 token |

Vite 开发和预览服务当前监听 `0.0.0.0:37001`，配置位于 `dockergo-web/vite.config.ts`。这不改变 LuCI 服务端口，也不改变应用的 Docker 端口映射。

## 12. 实现依据与维护检查

- [当前 YAML 目录](../datas/catalog.yaml) 与 [对应 JSON](../datas/catalog.json)。
- [前端参数类型](../dockergo-web/src/types.ts)、[目录解析与 API 请求](../dockergo-web/src/api/dockergo.ts)。
- [表单初始值](../dockergo-web/src/hooks/useInstaller.ts)、[安装配置表单](../dockergo-web/src/components/InstallDialog.tsx)。
- [后端校验和接口](../luci-app-dockergo/luasrc/controller/dockergo.lua)、[Docker 安装执行器](../luci-app-dockergo/root/usr/libexec/dockergo-install)。

新增应用时，先确认镜像入口与实际命令参数，再选择运行模式。无端口就不声明 `ports`；不需要映射就不声明 `volumes`；task 不声明 `autoStart`。发布目录时检查 YAML、两份 JSON 内容一致，并保证用户需要持久保存的任务输出目录标为必填。当前不会自动迁移或重建已有容器。
