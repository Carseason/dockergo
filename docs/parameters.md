# DockerGo 参数说明

本文对照当前应用目录、前端安装表单、LuCI API 和安装执行器整理，描述已实现的行为。主要面向应用市场条目维护者，同时说明安装请求与开发配置的区别。

## 1. 数据文件与读取流程

| 文件或接口 | 用途 |
| --- | --- |
| `datas/apps.yaml` | 人工维护的应用市场目录 |
| `datas/apps.json` | YAML 对应的 JSON 数据 |
| `GET /cgi-bin/luci/admin/services/dockergo/api/apps.json` | Controller 每次从固定 CDN 下载并校验后返回，不缓存 |

目录发布地址为 `https://github.com/Carseason/dockergo/releases/download/apps/apps.json`。网页仍调用同源 API，避免 GitHub Releases 下载链路缺少跨域允许头导致浏览器请求失败。下载和校验逻辑统一放在 Controller 中，不使用独立的 catalog 模块，也不读取或写入 `/var/run/dockergo/apps.json` 缓存。获取市场目录、安装校验和容器名称关联需要目录时，每次均重新下载，失败直接返回错误，不回退到旧数据。前端仍只在打开页面或手动刷新时请求市场目录，切换标签或视图不额外请求。

后端通过 `curl` 验证 HTTPS 证书，仅允许 HTTPS 重定向，连接超时 5 秒、总超时 20 秒、最多 5 次重定向，目录限制 1 MiB，并发送 `Cache-Control: no-cache, no-store`。插件依赖 `curl`、`ca-bundle`，临时下载文件位于 `/tmp` 下随机命名的私有目录，读取后立即删除，失败时也会清理，不持久保留下载结果。API 响应同样设置 `Cache-Control: no-store`。可在具备 LuCI Lua 环境的设备上运行 `lua tests/catalog_test.lua luasrc/controller/dockergo.lua` 测试逐次下载、校验和临时文件清理（测试使用内存模拟，不联网或改动设备目录）。

前端不直接读取 YAML，也不直接读取仓库中的 `datas/apps.json`。修改 YAML 后，在仓库根目录运行：

```sh
pnpm --dir dockergo-web run data:generate
```

首次使用请先运行 `pnpm --dir dockergo-web install --frozen-lockfile` 安装依赖。脚本仅将 YAML 转为 `datas/apps.json`，在根对象生成与 `apps`、`schemaVersion` 同级的 `tags` 字段；不向插件目录写入数据，也不生成独立标签文件。插件发布目录不携带应用市场数据。转换先检查根结构、应用 ID 唯一性、版本和标签格式；完整安装参数仍由后端校验。无效输入会报错退出，不覆盖已有生成文件。数字版本必须加引号。

应用内部的 `tags` 保留，作为应用与标签的关联；顶层 `tags` 是按首次出现顺序去重的标签字符串数组，每次生成时重新计算，不需要在 YAML 顶层维护。`/api/apps.json` 随应用数据一起返回该汇总，前端直接使用顶层 `tags` 渲染标签选项，并按应用内部 `tags` 匹配筛选结果，不再从应用列表汇总标签。顶层标签缺失或格式无效时显示错误提示；空数组表示仅显示“全部”。`build:luci` 和根目录 `./build.sh` 会自动执行转换。可运行 `pnpm --dir dockergo-web run test:data` 验证转换逻辑。修改目录后需将 `datas/apps.json` 发布到上述 CDN 地址；脚本不会自动上传 GitHub Release。

应用目录文件必须非空，且不超过 1 MiB。根结构如下：

```json
{
  "schemaVersion": 1,
  "apps": [],
  "tags": []
}
```

| 根字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `schemaVersion` | 整数 | 是 | 当前只支持 `1`，表示目录结构版本，不是应用版本 |
| `apps` | 应用对象数组 | 是 | 每个元素是一条可安装或可运行的应用，应用 ID 不可重复 |
| `tags` | 字符串数组 | 自动生成 | 汇总各应用的标签，按首次出现顺序去重；无标签时为 `[]` |

## 2. 应用一级字段

配置直接放在应用对象一级，不存在 `install` 配置层。

| 字段 | 类型 | 必填 / 默认值 | 含义与约束 |
| --- | --- | --- | --- |
| `id` | 字符串 | 必填 | 稳定的应用标识，用于安装请求、容器命名和关联目录信息。安装时要求匹配 `^[a-z0-9][a-z0-9._-]*$`，长度 1–64，在目录中唯一 |
| `title` | 字符串 | 必填 | 非空，市场卡片和配置弹窗的展示标题 |
| `version` | 字符串 | 必填 | 匹配 `^[A-Za-z0-9][A-Za-z0-9._-]*$`，长度 1–64；展示在卡片标题旁，并写入容器名称 |
| `description` | 字符串 | 必填 | 市场卡片简介；当前允许空字符串，建议填写实际用途 |
| `tags` | 字符串数组 | 必填 | 展示在简介下方，用于标签筛选匹配；选项直接读取 JSON 顶层 `tags`；无标签时填 `[]` |
| `image` | 字符串 | 必填 | 非空 Docker 镜像引用，例如 `nginx:1.30.5-alpine`；安装时执行镜像拉取 |
| `d` | 布尔值 | 默认 `true` | 后台启动；为 `false` 时附加输出并等待本次运行结束 |
| `rm` | 布尔值 | 默认 `false` | 容器退出后自动删除，成功与失败都会清理 |
| `restart` | 字符串 | 默认 `"no"` | `no`、`always`、`unless-stopped`、`on-failure`；作为表单重启策略默认值 |
| `ports` | 端口对象数组 | 默认 `[]` | 按数组数量和顺序渲染端口配置；没有端口就省略或填 `[]` |
| `volumes` | 存储对象数组 | 默认 `[]` | 按数组数量和顺序渲染目录或文件映射 |
| `environment` | 字符串键值对象 | 默认 `{}` | 固定环境变量，当前没有供用户编辑环境变量的表单 |
| `command` | 字符串数组 | 默认 `[]` | 放在镜像名之后的命令参数，可引用 `inputs` 的文本输入 |
| `inputs` | 输入对象数组 | 默认 `[]` | 所有应用均可声明；统一渲染为文本输入框 |

`version` 不会自动改写 `image` 的标签。例如只修改 `version` 而不修改 `image`，实际拉取的镜像仍由 `image` 决定。目录版本变化也不会更新已创建的容器。

市场按一个标签精确筛选，选择“全部”时显示所有应用。History 路径路由只保存已安装 / 市场视图：在 LuCI 基础路径 `/cgi-bin/luci/admin/services/dockergo` 下追加 `/installed` 或 `/market`，不使用 Hash。标签仅保存在当前页面内存，不写入 URL、历史记录或浏览器存储；选择标签不改变地址，刷新或重新登录后恢复“全部”。旧的市场标签子路径会丢弃筛选并规范为 `/market`。插件注册对应的 LuCI 页面入口，刷新及重新登录后均可返回同一视图，前进、后退也同步显示。根页面或未知前端路径默认显示已安装。路由和标签切换不重新加载应用目录或容器数据。

表中的字段是当前维护格式；不要依赖后端对不规范数据的宽松接受。例如应用 ID 的字符限制在安装阶段检查，`tags` 的每个元素当前没有经过后端严格字符串校验。写目录时仍应遵守表格中的类型和约束。

## 3. 后台运行、自动清理和重启策略

`mode` 和 `autoStart` 已移除，目录中继续声明这两个旧字段会被拒绝。三个新字段各自控制不同的行为：

| 组合 | 行为 |
| --- | --- |
| `d: true`, `rm: false` | 后台运行，退出后保留容器，适合 Nginx |
| `d: false`, `rm: true` | 等待本次命令结束并记录输出，退出后自动删除，适合 gallery-dl |
| `d: true`, `rm: true` | 后台运行，退出后自动删除；启动成功不代表命令已经完成 |
| `d: false`, `rm: false` | 等待本次运行结束，容器保留，便于排查和再次启动 |

| `restart` 值 | 行为 |
| --- | --- |
| `"no"` | 不自动重启 |
| `always` | 自动重启；手动停止后，在 Docker 服务重启时也会启动 |
| `unless-stopped` | 自动重启；手动停止后，在 Docker 服务重启时仍保持停止 |
| `on-failure` | 仅非零退出码时自动重启，不因 Docker 服务重启而自动启动 |

只有 `rm: false` 时表单才显示“重启策略”下拉框。`rm: true` 时隐藏该选项，重启策略固定为 `no`；目录和请求中将自动清理与其他重启策略组合都会被拒绝。当前只支持这四个完整值，不支持 `on-failure:3` 这样的重试次数后缀。YAML 中 `no` 应加引号。

创建弹窗提供“立即启动”，默认勾选，安装请求通过 `startNow` 控制。取消时仅创建容器，不运行镜像内的命令，稍后可以在已安装列表手动启动。切换选项不改变实例 ID。

勾选立即启动时执行 `docker run`：`d: true` 添加 `--detach`（等价于 `-d`）在后台运行，`d: false` 等待本次运行并把输出写入系统任务日志。取消勾选时执行 `docker create`，无论 `d` 是什么都不添加 `--detach`。两种情况下自动清理都传 `--rm` 并省略 `--restart`，否则传所选 `--restart`；`rm: true` 的未启动容器会保留，直到以后启动并退出才清理。前台容器启用重启策略时，附加客户端在首次退出时也可能结束，因此“本次运行已结束”不保证容器不再重启。已安装的保留容器再次启动仍使用 `docker start`。

系统任务名称固定为 `dockergo`。前台运行会占用任务直到本次附加客户端退出，后台运行只占用部署过程。自动清理后不能再查看 Docker 容器日志或点击“启动”，应查看系统任务日志或从市场创建新实例；需要保留的输出必须映射到宿主机。后台运行不会持续将应用日志写入系统任务。

未自动删除的容器再次启动会复用原有命令、输入、环境变量和挂载，不会重新询问参数，也不会走首次部署的系统任务日志流程。已有容器不会因目录迁移而自动删除、更新重启策略或重建。

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

目录内容由 `/apps.json` 返回给前端，环境变量不要包含真实密码、Token 等私密值。`environment` 的键值格式当前在安装阶段检查。

## 7. inputs 与 command：文本参数

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

当前 `datas/apps.yaml` 仅保留 Nginx，提供可选的静态文件目录映射；宿主机路径由用户安装时填写，留空则使用镜像内置的静态文件。版本和镜像值以该文件的后续修改为准。

```yaml
schemaVersion: 1
apps:
  - id: nginx
    title: Nginx
    version: "20261113"
    description: 高性能 HTTP 服务器与反向代理服务器
    tags: [网络, Web, 反向代理]
    image: "nginx:latest"
    d: true
    rm: false
    restart: unless-stopped
    ports:
      - port: 8080
        target: 80
        desc: 默认端口

    volumes:
      - target: /usr/share/nginx/html
        type: dir
        desc: 静态文件目录
```

## 9. 安装请求参数

接口为 `POST /cgi-bin/luci/admin/services/dockergo/api/install`，请求类型为 `application/x-www-form-urlencoded`，沿用 LuCI 登录会话并提交 CSRF token。

| 表单字段 | 传输形式 | 规则 |
| --- | --- | --- |
| `appId` | 字符串 | 已存在的目录应用 ID |
| `instanceId` | 字符串 | 必填，8 位小写十六进制字符；打开弹窗时由前端随机生成一次，修改配置和失败重试时保持不变 |
| `startNow` | `"1"` 或 `"0"` | 默认 `"1"`，控制立即运行或仅创建；其他值会被拒绝。它是安装请求字段，不是应用目录字段 |
| `ports` | JSON 字符串数组 | 必须提交，数量和顺序与目录 `ports` 一致，例如 `["8080"]`；没有端口时传 `[]` |
| `volumes` | JSON 字符串数组 | 必须提交，数量和顺序与目录 `volumes` 一致；每项是宿主机路径，空字符串跳过非必填项 |
| `inputs` | JSON 字符串键值对象 | 默认 `{}`；只允许声明过的输入，满足必填限制 |
| `restart` | 字符串 | 默认取目录值，目录省略时为 `no`；只接受四种策略，`rm: true` 时只能为 `no` |
| `token` | 字符串 | 当前 LuCI 会话 CSRF token，由挂载页面注入 |

注意：目录中的 `ports`/`volumes` 是对象数组，请求中的同名字段是用户值的字符串数组，不能直接照搬目录对象。`d` 与 `rm` 不由安装请求控制；后端会重新读取目录中的镜像、容器端口、挂载目标、环境变量、命令模板及这两个固定选项。

创建弹窗底部提供实时 Docker 运行命令预览，包括完整容器名称、后台运行、自动清理或重启策略、端口、非空挂载、环境变量及替换后的命令参数，不添加 DockerGo 标签或 `--network` 参数。特殊字符按 shell 参数转义，空挂载不生成 `--volume`。实例 ID 使用浏览器 `crypto.getRandomValues` 生成，预览不再使用占位符。必填值未填写时应先补全配置，预览不是已经执行的命令。

预览与执行器按“立即启动”选择同步使用 `docker run` 或 `docker create`，其他操作也使用 `docker pull`、`docker ps`、`docker start` 等简写，通过运行环境的 `PATH` 查找 Docker，不固定 `/usr/bin/docker` 路径。预览与实际运行参数语义一致，后端沿用提交的实例 ID 自行拼接名称，环境变量顺序不影响执行。

例如 gallery-dl 的表单字段值（下表尚未做 URL 编码）：

| 字段 | 值 |
| --- | --- |
| `appId` | `gallery-dl` |
| `instanceId` | `a1b2c3d4` |
| `startNow` | `1` |
| `ports` | `[]` |
| `volumes` | `["/mnt/sda1/gallery"]` |
| `inputs` | `{"url":"https://example.com/album"}` |
| `restart` | `no` |
| `token` | 当前会话值 |

提交成功返回 HTTP 202 和 `success`、`taskId`、`containerName`，只表示任务已创建，不表示安装或命令已经完成。`taskId` 固定为 `dockergo`，已有任务运行时返回 HTTP 409 / `TASK_BUSY`；运行结果通过系统任务日志和退出码判断。

缺失或无效的实例 ID 返回 HTTP 400 / `INVALID_INSTANCE_ID`。同名容器（包含已停止的容器）存在时返回 HTTP 409 / `CONTAINER_NAME_CONFLICT`，不静默生成新 ID。检查 Docker 失败时返回 HTTP 503 / `DOCKER_UNAVAILABLE`。重试保留原 ID；名称冲突时应关闭弹窗重新打开，生成新实例。随机 ID 不保证绝对唯一，也不是幂等凭据；系统任务并发限制与 Docker 自身的名称唯一性约束仍然生效，提交检查后的竞争冲突会在执行阶段报错。

## 10. 容器标识与其他接口参数

容器名称由后端按 `dgo_<id>_<version>_<8位实例ID>` 拼接，实例 ID 在打开弹窗时由前端生成；同一应用可创建多个实例，不提供自定义容器名字段。新建容器不添加任何 DockerGo `--label`；镜像自身定义的标签不受影响。

| 列表接口字段 | 来源 |
| --- | --- |
| `managed` | 名称符合完整 `dgo_<id>_<version>_<8位小写十六进制实例ID>` 格式且至少存在一种合法拆分 |
| `appId` | 从名称解析出的应用 ID |
| `appVersion` | 从名称解析出的实际版本，不强制等于目录当前版本 |
| `instanceId` | 名称末尾 8 位实例 ID |

ID 和版本都可能包含下划线。后端枚举合法拆分，只有唯一应用 ID 与当前目录匹配时才关联应用；无目录匹配但只有一种合法拆分时使用该拆分。存在歧义时保留 `managed` 和实例 ID，但将应用 ID、版本留空，卡片仍展示实际容器名和镜像，避免错误关联。目录缺失或损坏不阻止获取容器列表。

容器列表接口返回全部容器，前端“已安装”按 `managed` 为真或存在 `appId` 筛选，并通过 `appId` 关联市场信息。完整命名规则决定是否显示，仅 `dgo_` 前缀不足以匹配；手动使用完整规则命名的容器也会显示。容器改名为不符合规则的名称后不再显示。旧容器标签不读取、不修改，符合名称规则的已有容器继续显示。命名规则仅用于展示关联，不是权限边界。

已安装卡片会将名称解析出的 `appVersion` 与同一应用的目录 `version` 比较。不一致时在原版本号后追加市场版本，例如 `v1.30.5（20261113新版本）`，不另占提醒区块；一致、版本未知或找不到对应目录应用时不显示追加提示。这里仅比较目录版本字符串，不判断版本大小，不检查远端镜像，也不会自动更新容器。即使两边都为 `latest`，镜像仍可能不同，不能据此判断是否存在镜像更新。

其他接口共用 `/cgi-bin/luci/admin/services/dockergo/api` 前缀：

| 方法与路径 | 参数 | 当前行为 |
| --- | --- | --- |
| `GET /apps.json` | 无 | 返回目录，结构版本固定为 1 |
| `GET /containers` | 无 | 返回全部 Docker 容器和按名称解析的 DockerGo 关联信息 |
| `GET /files` | `path`，默认 `/mnt` | 返回可浏览目录和文件，类型字段为 `directory` / `file`；这是接口返回类型，不是目录 `volumes.type` |
| `GET /inspect` | `id` | 返回容器状态、端口、挂载、命令和网络等详情 |
| `GET /logs` | `id` | 返回最近 300 行带时间戳的容器日志，不是持续订阅 |
| `POST /control` | `id`、`action`、`token` | `action` 仅支持 `start`、`pause`、`unpause` |
| `POST /remove` | `id`、`token` | 强制停止并删除容器，保留镜像和映射数据 |

以上容器 `id` 是 12–64 位小写十六进制 Docker ID，不是市场应用 `id` 或容器名称。

## 11. 固定行为与开发配置

以下是程序当前的固定行为，不是可写入应用目录的字段：省略 `--network`，使用 Docker 默认 `bridge` 网络，不创建专用网络；自动拉取镜像；端口使用 TCP 并监听 `0.0.0.0`；挂载默认读写；系统任务名称 `dockergo`；临时安装配置保存在 `/var/run/dockergo` 并由执行器读取后删除。目录不支持自动更新、特权模式、自定义网络、资源限制、只读挂载或任务超时等设置。已有容器的网络不自动迁移，已有 `dockergo_default` 网络不删除。

开发环境参数与目录字段分开配置：

| 参数 | 来源 | 用途 |
| --- | --- | --- |
| `DOCKERGO_ROUTER_URL` | Vite 环境变量 | 将开发服务的 `/cgi-bin/luci` 请求代理到路由器 |
| `VITE_DOCKERGO_API_URL` | 前端构建环境变量 | API 前缀；默认 `/cgi-bin/luci/admin/services/dockergo/api` |
| `VITE_DOCKERGO_CSRF_TOKEN` | 前端构建环境变量 | 独立开发时使用的会话 CSRF token；不要提交真实值 |
| `window.DockerGoConfig.apiBase` | LuCI 挂载页面注入 | 优先于 `VITE_DOCKERGO_API_URL` 的 API 前缀 |
| `window.DockerGoConfig.pageBase` | LuCI 挂载页面注入 | History 页面路由基础路径，与 API 前缀分开；旧挂载页未注入时从 `apiBase` 推导 |
| `window.DockerGoConfig.csrfToken` | LuCI 挂载页面注入 | 优先于环境变量的会话 token |

Vite 开发和预览服务当前监听 `0.0.0.0:37001`，配置位于 `dockergo-web/vite.config.ts`。这不改变 LuCI 服务端口，也不改变应用的 Docker 端口映射。

## 12. 实现依据与维护检查

- [当前 YAML 目录](../datas/apps.yaml) 与 [对应 JSON](../datas/apps.json)。
- [前端参数类型](../dockergo-web/src/types.ts)、[目录解析与 API 请求](../dockergo-web/src/api/dockergo.ts)。
- [表单初始值](../dockergo-web/src/hooks/useInstaller.ts)、[安装配置表单](../dockergo-web/src/components/InstallDialog.tsx)。
- [后端校验和接口](../luci-app-dockergo/luasrc/controller/dockergo.lua)、[Docker 安装执行器](../luci-app-dockergo/root/usr/libexec/dockergo-install)。

新增应用时，先确认镜像入口与实际命令参数，再选择 `d`、`rm` 和 `restart`。无端口就不声明 `ports`；不需要映射就不声明 `volumes`；自动清理时只能使用 `restart: "no"`。发布目录时检查 `datas/apps.yaml` 与生成的 `datas/apps.json` 内容一致，并保证用户需要持久保存的输出目录标为必填。当前不会自动迁移或重建已有容器。
