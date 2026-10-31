#!/usr/bin/env ucode

'use strict';

import { popen } from 'fs';

const DOCKER_COMMAND = "/usr/bin/docker container ls --all --no-trunc --format '{{json .}}'";

function string_value(value) {
	return value == null ? '' : `${value}`;
}

function valid_container_id(container_id) {
	return match(container_id, /^[a-f0-9]{12,64}$/) != null;
}

function invalid_container_id() {
	return {
		success: false,
		error: {
			code: 'INVALID_CONTAINER_ID',
			message: '容器 ID 无效',
		},
	};
}

function normalize_container(raw) {
	return {
		id: string_value(raw.ID),
		name: string_value(raw.Names),
		image: string_value(raw.Image),
		command: string_value(raw.Command),
		createdAt: string_value(raw.CreatedAt),
		runningFor: string_value(raw.RunningFor),
		ports: string_value(raw.Ports),
		state: string_value(raw.State),
		status: string_value(raw.Status),
		networks: string_value(raw.Networks),
		mounts: string_value(raw.Mounts),
	};
}

function list_containers() {
	const process = popen(DOCKER_COMMAND, 'r');
	if (!process) {
		return {
			containers: [],
			error: {
				code: 'DOCKER_EXEC_FAILED',
				message: '无法启动 Docker 命令',
			},
		};
	}

	const containers = [];
	let malformed = 0;
	let line;

	while ((line = process.read('line')) != null && length(line)) {
		line = trim(line);
		if (!length(line))
			continue;

		try {
			push(containers, normalize_container(json(line)));
		}
		catch (e) {
			malformed++;
		}
	}

	const exit_code = process.close();
	if (exit_code != 0) {
		return {
			containers: [],
			error: {
				code: 'DOCKER_UNAVAILABLE',
				message: 'Docker 服务不可用或当前用户无法访问 Docker',
			},
		};
	}

	if (malformed > 0) {
		return {
			containers,
			error: {
				code: 'DOCKER_OUTPUT_INVALID',
				message: `有 ${malformed} 条 Docker 容器记录无法解析`,
			},
		};
	}

	return {
		containers,
		generatedAt: time(),
	};
}

function control_container(request) {
	const container_id = string_value(request?.args?.id);
	const action = string_value(request?.args?.action);

	if (!valid_container_id(container_id))
		return invalid_container_id();

	if (action != 'start' && action != 'pause' && action != 'unpause') {
		return {
			success: false,
			error: {
				code: 'INVALID_ACTION',
				message: '不支持的容器操作',
			},
		};
	}

	const process = popen(`/usr/bin/docker ${action} ${container_id} 2>&1`, 'r');
	if (!process) {
		return {
			success: false,
			error: {
				code: 'DOCKER_EXEC_FAILED',
				message: '无法启动 Docker 命令',
			},
		};
	}

	const output = trim(process.read('all') || '');
	const exit_code = process.close();
	if (exit_code != 0) {
		return {
			success: false,
			error: {
				code: 'DOCKER_ACTION_FAILED',
				message: output || 'Docker 容器操作失败',
			},
		};
	}

	return {
		success: true,
		id: container_id,
		action,
	};
}

function inspect_container(request) {
	const container_id = string_value(request?.args?.id);
	if (!valid_container_id(container_id))
		return invalid_container_id();

	const process = popen(`/usr/bin/docker inspect --format '{{json .}}' ${container_id} 2>&1`, 'r');
	if (!process) {
		return {
			success: false,
			error: {
				code: 'DOCKER_EXEC_FAILED',
				message: '无法启动 Docker 命令',
			},
		};
	}

	const output = trim(process.read('all') || '');
	const exit_code = process.close();
	if (exit_code != 0) {
		return {
			success: false,
			error: {
				code: 'DOCKER_INSPECT_FAILED',
				message: output || '无法读取容器详情',
			},
		};
	}

	let raw;
	try {
		raw = json(output);
	}
	catch (e) {
		return {
			success: false,
			error: {
				code: 'DOCKER_OUTPUT_INVALID',
				message: 'Docker 返回了无法解析的容器详情',
			},
		};
	}

	return {
		success: true,
		container: {
			id: string_value(raw?.Id),
			name: string_value(raw?.Name),
			image: string_value(raw?.Config?.Image),
			imageId: string_value(raw?.Image),
			createdAt: string_value(raw?.Created),
			platform: string_value(raw?.Platform),
			driver: string_value(raw?.Driver),
			restartPolicy: string_value(raw?.HostConfig?.RestartPolicy?.Name),
			networkMode: string_value(raw?.HostConfig?.NetworkMode),
			command: {
				path: string_value(raw?.Path),
				args: raw?.Args || [],
			},
			state: {
				status: string_value(raw?.State?.Status),
				running: !!raw?.State?.Running,
				paused: !!raw?.State?.Paused,
				restarting: !!raw?.State?.Restarting,
				oomKilled: !!raw?.State?.OOMKilled,
				dead: !!raw?.State?.Dead,
				pid: raw?.State?.Pid || 0,
				exitCode: raw?.State?.ExitCode || 0,
				error: string_value(raw?.State?.Error),
				startedAt: string_value(raw?.State?.StartedAt),
				finishedAt: string_value(raw?.State?.FinishedAt),
				health: string_value(raw?.State?.Health?.Status),
			},
			ports: raw?.NetworkSettings?.Ports || {},
			networks: raw?.NetworkSettings?.Networks || {},
			mounts: raw?.Mounts || [],
		},
	};
}

return {
	'luci.dockergo': {
		list: {
			call: list_containers,
		},
		inspect: {
			args: {
				id: '',
			},
			call: inspect_container,
		},
		control: {
			args: {
				id: '',
				action: '',
			},
			call: control_container,
		},
	},
};
