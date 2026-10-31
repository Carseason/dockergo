#!/usr/bin/env ucode

'use strict';

import { popen } from 'fs';

const DOCKER_COMMAND = "/usr/bin/docker container ls --all --no-trunc --format '{{json .}}'";

function string_value(value) {
	return value == null ? '' : `${value}`;
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

return {
	'luci.dockergo': {
		list: {
			call: list_containers,
		},
	},
};
