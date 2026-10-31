import type {
  DockerApiError,
  DockerContainerAction,
  DockerContainerActionResponse,
  DockerContainerInspectResponse,
  DockerContainerListResponse,
  DockerContainerLogsResponse,
  DockerContainerRemoveResponse,
} from "../types"

declare global {
  interface Window {
    DockerGoConfig?: {
      apiBase: string
      csrfToken: string
    }
  }
}

type ErrorResponse = {
  error?: DockerApiError
}

function getApiBase(): string {
  const configuredBase =
    window.DockerGoConfig?.apiBase ||
    import.meta.env.VITE_DOCKERGO_API_URL ||
    "/cgi-bin/luci/admin/services/dockergo/api"

  return configuredBase.replace(/\/$/, "")
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBase()}/${path}`, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  })

  let payload: T & ErrorResponse | undefined
  try {
    payload = ((await response.json()) as T & ErrorResponse)
  } catch {
    throw new Error(`DockerGo API 返回了无效响应（HTTP ${response.status}）`)
  }

  if (!response.ok) {
    throw new Error(
      payload.error?.message ||
        `DockerGo API 请求失败（HTTP ${response.status}）`,
    )
  }

  return payload
}

export function listDockerContainers(): Promise<DockerContainerListResponse> {
  return requestJson<DockerContainerListResponse>("containers")
}

export function controlDockerContainer(
  id: string,
  action: DockerContainerAction,
): Promise<DockerContainerActionResponse> {
  const csrfToken =
    window.DockerGoConfig?.csrfToken ||
    import.meta.env.VITE_DOCKERGO_CSRF_TOKEN ||
    ""

  return requestJson<DockerContainerActionResponse>("control", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: new URLSearchParams({ id, action, token: csrfToken }),
  })
}

export async function inspectDockerContainer(
  id: string,
): Promise<DockerContainerInspectResponse> {
  const response = await requestJson<DockerContainerInspectResponse>(
    `inspect?id=${encodeURIComponent(id)}`,
  )

  if (response.container) {
    const command = response.container.command
    const args: unknown = command?.args
    const mounts: unknown = response.container.mounts

    response.container.command = {
      path: typeof command?.path === "string" ? command.path : "",
      args: Array.isArray(args)
        ? args.filter((arg): arg is string => typeof arg === "string")
        : [],
    }
    response.container.mounts = Array.isArray(mounts) ? mounts : []
  }

  return response
}

export function getDockerContainerLogs(
  id: string,
): Promise<DockerContainerLogsResponse> {
  return requestJson<DockerContainerLogsResponse>(
    `logs?id=${encodeURIComponent(id)}`,
  )
}

export function removeDockerContainer(
  id: string,
): Promise<DockerContainerRemoveResponse> {
  const csrfToken =
    window.DockerGoConfig?.csrfToken ||
    import.meta.env.VITE_DOCKERGO_CSRF_TOKEN ||
    ""

  return requestJson<DockerContainerRemoveResponse>("remove", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: new URLSearchParams({ id, token: csrfToken }),
  })
}
