module("luci.controller.dockergo", package.seeall)

local http = require "luci.http"
local jsonc = require "luci.jsonc"
local sys = require "luci.sys"
local fs = require "nixio.fs"

local LIST_COMMAND = "/usr/bin/docker container ls --all --no-trunc --format '{{json .}}'"
local EXIT_MARKER = "__DOCKERGO_EXIT__"
local CATALOG_PATH = "/usr/share/dockergo/catalog.json"
local CATALOG_MAX_BYTES = 1024 * 1024
local INSTALL_TASK_DIR = "/var/run/dockergo"
local INSTALL_TASK_ID = "dockergo"
local INSTALL_RUNNER = "/usr/libexec/dockergo-install"

function index()
	entry({"admin", "services", "dockergo", "api", "catalog"}, call("api_catalog")).leaf = true
	entry({"admin", "services", "dockergo", "api", "directories"}, call("api_list_directories")).leaf = true
	entry({"admin", "services", "dockergo", "api", "install"}, post("api_install_app")).leaf = true
	entry({"admin", "services", "dockergo", "api", "containers"}, call("api_list_containers")).leaf = true
	entry({"admin", "services", "dockergo", "api", "inspect"}, call("api_inspect_container")).leaf = true
	entry({"admin", "services", "dockergo", "api", "logs"}, call("api_container_logs")).leaf = true
	entry({"admin", "services", "dockergo", "api", "control"}, post("api_control_container")).leaf = true
	entry({"admin", "services", "dockergo", "api", "remove"}, post("api_remove_container")).leaf = true
end

local function valid_directory_path(path)
	if path == "/mnt" then
		return true
	end

	if type(path) ~= "string" or #path > 240 or path:sub(1, 5) ~= "/mnt/" or
		path:sub(-1) == "/" or path:find("//", 1, true) ~= nil then
		return false
	end

	for segment in path:sub(6):gmatch("[^/]+") do
		if segment:match("^[A-Za-z0-9][A-Za-z0-9._-]*$") == nil then
			return false
		end
	end

	return true
end

local function directory_exists_without_links(path)
	if fs.lstat("/mnt", "type") ~= "dir" then
		return false
	end

	local current = "/mnt"
	for segment in path:sub(6):gmatch("[^/]+") do
		current = current .. "/" .. segment
		if fs.lstat(current, "type") ~= "dir" then
			return false
		end
	end

	return true
end

local function valid_catalog(catalog)
	if type(catalog) ~= "table" or catalog.schemaVersion ~= 1 or type(catalog.apps) ~= "table" then
		return false, "应用目录根结构无效"
	end

	local ids = {}
	for index, app in ipairs(catalog.apps) do
		if type(app) ~= "table" or type(app.id) ~= "string" or app.id == "" or
			type(app.title) ~= "string" or app.title == "" or
			type(app.description) ~= "string" or type(app.image) ~= "string" or app.image == "" or
			type(app.tags) ~= "table" then
			return false, string.format("第 %d 个应用的数据结构无效", index)
		end

		if ids[app.id] then
			return false, string.format("应用 ID %s 重复", app.id)
		end
		ids[app.id] = true

		if app.ports ~= nil and type(app.ports) ~= "table" then
			return false, string.format("应用 %s 的端口配置无效", app.id)
		end
		if app.volumes ~= nil and type(app.volumes) ~= "table" then
			return false, string.format("应用 %s 的存储配置无效", app.id)
		end
		if app.environment ~= nil and type(app.environment) ~= "table" then
			return false, string.format("应用 %s 的环境变量配置无效", app.id)
		end
		if app.command ~= nil and type(app.command) ~= "table" then
			return false, string.format("应用 %s 的启动命令无效", app.id)
		end
	end

	return true
end

local function string_value(value)
	if value == nil then
		return ""
	end

	return tostring(value)
end

local function valid_container_id(container_id)
	return container_id ~= nil and container_id:match("^[a-f0-9][a-f0-9]+$") ~= nil and
		#container_id >= 12 and #container_id <= 64
end

local function write_json(status, payload)
	http.status(status)
	http.header("Cache-Control", "no-store")
	http.prepare_content("application/json")
	http.write(jsonc.stringify(payload))
end

local function write_error(status, code, message, extra)
	local payload = extra or {}
	payload.success = false
	payload.error = {
		code = code,
		message = message,
	}
	write_json(status, payload)
end

local function run(command)
	local output = sys.exec(command .. " 2>&1; printf '\\n" .. EXIT_MARKER .. "%s' $?") or ""
	local status = tonumber(output:match("\n" .. EXIT_MARKER .. "(%d+)$")) or 255
	output = output:gsub("\n" .. EXIT_MARKER .. "%d+$", "")
	return status, output
end

local function load_catalog()
	local file = io.open(CATALOG_PATH, "r")
	if not file then
		return nil, 503, "CATALOG_UNAVAILABLE", "应用目录文件不存在"
	end

	local contents = file:read("*a") or ""
	file:close()

	if #contents == 0 or #contents > CATALOG_MAX_BYTES then
		return nil, 502, "CATALOG_INVALID", "应用目录文件为空或超过大小限制"
	end

	local catalog = jsonc.parse(contents)
	local valid, message = valid_catalog(catalog)
	if not valid then
		return nil, 502, "CATALOG_INVALID", message
	end

	return catalog
end

function api_catalog()
	local catalog, status, code, message = load_catalog()
	if not catalog then
		write_error(status, code, message)
		return
	end

	write_json(200, catalog)
end

function api_list_directories()
	local path = http.formvalue("path") or "/mnt"
	if not valid_directory_path(path) then
		write_error(400, "INVALID_DIRECTORY_PATH", "只能浏览 /mnt 下的目录")
		return
	end

	if not directory_exists_without_links(path) then
		write_error(404, "DIRECTORY_NOT_FOUND", "目录不存在或不可访问")
		return
	end

	local iterator = fs.dir(path)
	if not iterator then
		write_error(403, "DIRECTORY_UNREADABLE", "无法读取该目录")
		return
	end

	local directories = {}
	for name in iterator do
		if name:match("^[A-Za-z0-9][A-Za-z0-9._-]*$") then
			local child_path = path .. "/" .. name
			if fs.lstat(child_path, "type") == "dir" then
				directories[#directories + 1] = {
					name = name,
					path = child_path,
				}
			end
		end
	end

	table.sort(directories, function(left, right)
		return left.name:lower() < right.name:lower()
	end)

	local parent
	if path ~= "/mnt" then
		parent = path:match("^(.*)/[^/]+$") or "/mnt"
		if parent:sub(1, 4) ~= "/mnt" then
			parent = "/mnt"
		end
	end

	write_json(200, {
		success = true,
		path = path,
		parent = parent,
		directories = directories,
	})
end

local function find_catalog_app(catalog, app_id)
	for _, app in ipairs(catalog.apps) do
		if app.id == app_id then
			return app
		end
	end
end

local function valid_app_id(app_id)
	return type(app_id) == "string" and app_id:match("^[a-z0-9][a-z0-9._-]*$") ~= nil and
		#app_id <= 64
end

local function valid_data_directory(path)
	if type(path) ~= "string" or #path > 240 or
		path:find("..", 1, true) ~= nil or path:find("//", 1, true) ~= nil then
		return false
	end

	local app_data_path = path:match("^/docker/apps/[A-Za-z0-9][A-Za-z0-9._/-]*$") ~= nil
	local mounted_data_path = path:match(
		"^/mnt/[A-Za-z0-9][A-Za-z0-9._-]*/[A-Za-z0-9][A-Za-z0-9._/-]*$") ~= nil
	return app_data_path or mounted_data_path
end

local function task_suffix()
	local uuid = string_value(sys.exec("cat /proc/sys/kernel/random/uuid 2>/dev/null"))
	local suffix = uuid:match("^([a-f0-9]+)")
	if suffix and #suffix >= 8 then
		return suffix:sub(1, 8)
	end

	return string.format("%08x", os.time())
end

function api_install_app()
	local app_id = http.formvalue("appId")
	if not valid_app_id(app_id) then
		write_error(400, "INVALID_APP_ID", "应用 ID 无效")
		return
	end

	local catalog, status, code, message = load_catalog()
	if not catalog then
		write_error(status, code, message)
		return
	end

	local app = find_catalog_app(catalog, app_id)
	if not app then
		write_error(404, "APP_NOT_FOUND", "应用目录中不存在该应用")
		return
	end

	local ports = app.ports or {}
	local volumes = app.volumes or {}
	if #ports > 1 or #volumes > 1 then
		write_error(422, "INSTALL_CONFIG_UNSUPPORTED", "当前安装器仅支持一个端口和一个数据目录")
		return
	end

	local port = ports[1]
	local host_port
	if port then
		host_port = tonumber(http.formvalue("hostPort"))
		if not host_port or host_port % 1 ~= 0 or host_port < 1 or host_port > 65535 or
			type(port.container) ~= "number" or port.container % 1 ~= 0 or
			port.container < 1 or port.container > 65535 then
			write_error(400, "INVALID_PORT", "端口配置无效")
			return
		end
	end

	local data_directory
	if volumes[1] then
		data_directory = http.formvalue("dataDirectory")
		if not valid_data_directory(data_directory) or
			type(volumes[1].container) ~= "string" or volumes[1].container:sub(1, 1) ~= "/" then
			write_error(400, "INVALID_DATA_DIRECTORY", "数据目录必须位于 /docker/apps/ 或 /mnt/<磁盘>/ 下")
			return
		end
	end

	local environment = app.environment or {}
	for key, value in pairs(environment) do
		if type(key) ~= "string" or key:match("^[A-Za-z_][A-Za-z0-9_]*$") == nil or
			type(value) ~= "string" then
			write_error(502, "CATALOG_INVALID", "应用环境变量配置无效")
			return
		end
	end

	local command = app.command or {}
	for _, argument in ipairs(command) do
		if type(argument) ~= "string" then
			write_error(502, "CATALOG_INVALID", "应用启动命令配置无效")
			return
		end
	end

	local suffix = task_suffix()
	local config_id = "dockergo-install-" .. app.id .. "-" .. suffix
	local task_path = INSTALL_TASK_DIR .. "/" .. config_id .. ".json"
	local task_config = {
		appId = app.id,
		title = app.title,
		image = app.image,
		containerName = app.id .. "-" .. suffix,
		autoStart = http.formvalue("autoStart") == "1",
		environment = environment,
		command = command,
	}

	if port then
		task_config.port = {
			host = host_port,
			container = port.container,
		}
	end
	if volumes[1] then
		task_config.volume = {
			host = data_directory,
			container = volumes[1].container,
		}
	end

	local current_task = require("luci.model.tasks").status(INSTALL_TASK_ID)
	if current_task.running then
		write_error(409, "TASK_BUSY", "DockerGo 安装任务正在执行，请等待当前任务完成")
		return
	end

	if sys.call("mkdir -p " .. INSTALL_TASK_DIR .. " && chmod 700 " .. INSTALL_TASK_DIR) ~= 0 then
		write_error(500, "TASK_CONFIG_FAILED", "无法创建安装任务目录")
		return
	end

	local file = io.open(task_path, "w")
	if not file then
		write_error(500, "TASK_CONFIG_FAILED", "无法保存安装任务配置")
		return
	end
	file:write(jsonc.stringify(task_config))
	file:close()
	sys.call("chmod 600 " .. task_path)

	local task_command = INSTALL_RUNNER .. " " .. config_id
	local launch_command = string.format("/etc/init.d/tasks task_add %s %s -1 >/dev/null 2>&1",
		INSTALL_TASK_ID, require("luci.util").shellquote(task_command))
	if sys.call(launch_command) ~= 0 then
		os.remove(task_path)
		local task_status = require("luci.model.tasks").status(INSTALL_TASK_ID)
		if task_status.running then
			write_error(409, "TASK_BUSY", "DockerGo 安装任务正在执行，请等待当前任务完成")
		else
			write_error(500, "TASK_START_FAILED", "无法启动安装任务")
		end
		return
	end

	write_json(202, {
		success = true,
		taskId = INSTALL_TASK_ID,
		containerName = task_config.containerName,
	})
end

local function normalize_container(raw)
	return {
		id = string_value(raw.ID),
		name = string_value(raw.Names),
		image = string_value(raw.Image),
		command = string_value(raw.Command),
		createdAt = string_value(raw.CreatedAt),
		runningFor = string_value(raw.RunningFor),
		ports = string_value(raw.Ports),
		state = string_value(raw.State),
		status = string_value(raw.Status),
		networks = string_value(raw.Networks),
		mounts = string_value(raw.Mounts),
	}
end

function api_list_containers()
	local status, output = run(LIST_COMMAND)
	if status ~= 0 then
		write_error(503, "DOCKER_UNAVAILABLE", output ~= "" and output or
			"Docker 服务不可用或当前用户无法访问 Docker", { containers = {} })
		return
	end

	local containers = {}
	local malformed = 0
	for line in output:gmatch("[^\r\n]+") do
		local raw = jsonc.parse(line)
		if raw then
			containers[#containers + 1] = normalize_container(raw)
		else
			malformed = malformed + 1
		end
	end

	if malformed > 0 then
		write_error(502, "DOCKER_OUTPUT_INVALID",
			string.format("有 %d 条 Docker 容器记录无法解析", malformed), { containers = containers })
		return
	end

	write_json(200, {
		containers = containers,
		generatedAt = os.time(),
	})
end

function api_control_container()
	local container_id = http.formvalue("id")
	local action = http.formvalue("action")

	if not valid_container_id(container_id) then
		write_error(400, "INVALID_CONTAINER_ID", "容器 ID 无效")
		return
	end

	if action ~= "start" and action ~= "pause" and action ~= "unpause" then
		write_error(400, "INVALID_ACTION", "不支持的容器操作")
		return
	end

	local status, output = run(string.format("/usr/bin/docker %s %s", action, container_id))
	if status ~= 0 then
		write_error(500, "DOCKER_ACTION_FAILED", output ~= "" and output or "Docker 容器操作失败")
		return
	end

	write_json(200, {
		success = true,
		id = container_id,
		action = action,
	})
end

function api_inspect_container()
	local container_id = http.formvalue("id")
	if not valid_container_id(container_id) then
		write_error(400, "INVALID_CONTAINER_ID", "容器 ID 无效")
		return
	end

	local status, output = run(string.format(
		"/usr/bin/docker inspect --format '{{json .}}' %s", container_id))
	if status ~= 0 then
		write_error(404, "DOCKER_INSPECT_FAILED", output ~= "" and output or "无法读取容器详情")
		return
	end

	local raw = jsonc.parse(output)
	if not raw then
		write_error(502, "DOCKER_OUTPUT_INVALID", "Docker 返回了无法解析的容器详情")
		return
	end

	write_json(200, {
		success = true,
		container = {
			id = string_value(raw.Id),
			name = string_value(raw.Name),
			image = string_value(raw.Config and raw.Config.Image),
			imageId = string_value(raw.Image),
			createdAt = string_value(raw.Created),
			platform = string_value(raw.Platform),
			driver = string_value(raw.Driver),
			restartPolicy = string_value(raw.HostConfig and raw.HostConfig.RestartPolicy and
				raw.HostConfig.RestartPolicy.Name),
			networkMode = string_value(raw.HostConfig and raw.HostConfig.NetworkMode),
			command = {
				path = string_value(raw.Path),
				args = raw.Args or {},
			},
			state = {
				status = string_value(raw.State and raw.State.Status),
				running = raw.State and raw.State.Running or false,
				paused = raw.State and raw.State.Paused or false,
				restarting = raw.State and raw.State.Restarting or false,
				oomKilled = raw.State and raw.State.OOMKilled or false,
				dead = raw.State and raw.State.Dead or false,
				pid = raw.State and raw.State.Pid or 0,
				exitCode = raw.State and raw.State.ExitCode or 0,
				error = string_value(raw.State and raw.State.Error),
				startedAt = string_value(raw.State and raw.State.StartedAt),
				finishedAt = string_value(raw.State and raw.State.FinishedAt),
				health = string_value(raw.State and raw.State.Health and raw.State.Health.Status),
			},
			ports = raw.NetworkSettings and raw.NetworkSettings.Ports or {},
			networks = raw.NetworkSettings and raw.NetworkSettings.Networks or {},
			mounts = raw.Mounts or {},
		},
	})
end

function api_container_logs()
	local container_id = http.formvalue("id")
	if not valid_container_id(container_id) then
		write_error(400, "INVALID_CONTAINER_ID", "容器 ID 无效")
		return
	end

	local status, output = run(string.format(
		"/usr/bin/docker logs --tail 300 --timestamps %s", container_id))
	if status ~= 0 then
		write_error(404, "DOCKER_LOGS_FAILED", output ~= "" and output or "无法读取容器日志")
		return
	end

	local lines = {}
	for line in output:gmatch("[^\r\n]+") do
		lines[#lines + 1] = line
	end

	write_json(200, {
		success = true,
		id = container_id,
		lines = lines,
	})
end

function api_remove_container()
	local container_id = http.formvalue("id")
	if not valid_container_id(container_id) then
		write_error(400, "INVALID_CONTAINER_ID", "容器 ID 无效")
		return
	end

	local status, output = run(string.format(
		"/usr/bin/docker container rm --force %s", container_id))
	if status ~= 0 then
		write_error(500, "DOCKER_REMOVE_FAILED", output ~= "" and output or "无法卸载容器")
		return
	end

	write_json(200, {
		success = true,
		id = container_id,
	})
end
