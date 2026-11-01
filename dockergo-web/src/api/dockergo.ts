import type {
  CatalogApp,
  CatalogPort,
  CatalogResponse,
  CatalogVolume,
  DockerApiError,
  DockerContainerAction,
  DockerContainerActionResponse,
  DockerContainerInspectResponse,
  DockerContainerListResponse,
  DockerContainerLogsResponse,
  DockerContainerRemoveResponse,
  DockerFileListResponse,
  DockerInstallResponse,
  InstallConfiguration,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeCatalogPort(value: unknown): CatalogPort | null {
  if (!isRecord(value)) return null

  const port = value.port
  const target = value.target
  const desc = value.desc

  if (
    !Number.isInteger(port) ||
    !Number.isInteger(target) ||
    typeof desc !== "string" ||
    desc.length === 0
  ) {
    return null
  }

  return { port: port as number, target: target as number, desc }
}

function normalizeCatalogVolume(value: unknown): CatalogVolume | null {
  if (!isRecord(value)) return null

  const target = value.target
  const type = value.type
  const desc = value.desc
  if (
    typeof target !== "string" ||
    (type !== "dir" && type !== "file") ||
    typeof desc !== "string" ||
    desc.length === 0
  ) {
    return null
  }

  return { target, type, desc }
}

function normalizeCatalogApp(value: unknown): CatalogApp | null {
  if (!isRecord(value)) return null

  const { id, title, version, description, image } = value
  if (
    typeof id !== "string" ||
    typeof title !== "string" ||
    typeof version !== "string" ||
    version.length === 0 ||
    typeof description !== "string" ||
    typeof image !== "string"
  ) {
    return null
  }
  if (value.autoStart !== undefined && typeof value.autoStart !== "boolean") {
    return null
  }

  const tags = Array.isArray(value.tags)
    ? value.tags.filter((tag): tag is string => typeof tag === "string")
    : []
  const ports = Array.isArray(value.ports)
    ? value.ports
        .map(normalizeCatalogPort)
        .filter((port): port is CatalogPort => port !== null)
    : []
  const volumes = Array.isArray(value.volumes)
    ? value.volumes
        .map(normalizeCatalogVolume)
        .filter((volume): volume is CatalogVolume => volume !== null)
    : []
  const environment = isRecord(value.environment)
    ? Object.fromEntries(
        Object.entries(value.environment).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      )
    : {}
  const command = Array.isArray(value.command)
    ? value.command.filter(
        (argument): argument is string => typeof argument === "string",
      )
    : []

  return {
    id,
    title,
    version,
    description,
    tags,
    image,
    ports,
    volumes,
    environment,
    command,
    autoStart:
      typeof value.autoStart === "boolean" ? value.autoStart : undefined,
  }
}

export async function listCatalogApps(): Promise<CatalogResponse> {
  const payload = await requestJson<unknown>("catalog")
  if (!isRecord(payload) || payload.schemaVersion !== 1) {
    throw new Error("DockerGo API 返回了不支持的应用目录版本")
  }

  if (!Array.isArray(payload.apps)) {
    throw new Error("DockerGo API 返回了无效的应用目录")
  }

  const apps = payload.apps.map(normalizeCatalogApp)
  if (apps.some((app) => app === null)) {
    throw new Error("DockerGo API 返回的应用目录包含无效数据")
  }

  return { schemaVersion: 1, apps: apps as CatalogApp[] }
}

export function listDockerContainers(): Promise<DockerContainerListResponse> {
  return requestJson<DockerContainerListResponse>("containers")
}

export function listDockerFiles(path: string): Promise<DockerFileListResponse> {
  return requestJson<DockerFileListResponse>(
    `files?path=${encodeURIComponent(path)}`,
  )
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

export function installCatalogApp(
  appId: string,
  configuration: InstallConfiguration,
): Promise<DockerInstallResponse> {
  const csrfToken =
    window.DockerGoConfig?.csrfToken ||
    import.meta.env.VITE_DOCKERGO_CSRF_TOKEN ||
    ""

  return requestJson<DockerInstallResponse>("install", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: new URLSearchParams({
      appId,
      ports: JSON.stringify(configuration.ports),
      volumes: JSON.stringify(configuration.volumes),
      autoStart: configuration.autoStart ? "1" : "0",
      token: csrfToken,
    }),
  })
}
