module("luci.controller.dockergo", package.seeall)

local http = require "luci.http"
local jsonc = require "luci.jsonc"
local sys = require "luci.sys"

local LIST_COMMAND = "/usr/bin/docker container ls --all --no-trunc --format '{{json .}}'"
local EXIT_MARKER = "__DOCKERGO_EXIT__"

function index()
	entry({"admin", "services", "dockergo", "api", "containers"}, call("api_list_containers")).leaf = true
	entry({"admin", "services", "dockergo", "api", "inspect"}, call("api_inspect_container")).leaf = true
	entry({"admin", "services", "dockergo", "api", "logs"}, call("api_container_logs")).leaf = true
	entry({"admin", "services", "dockergo", "api", "control"}, post("api_control_container")).leaf = true
	entry({"admin", "services", "dockergo", "api", "remove"}, post("api_remove_container")).leaf = true
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
