import type {
  DockerContainerAction,
  DockerContainerActionResponse,
  DockerContainerListResponse,
} from "../types"

type LuCIBridge = {
  listContainers: () => Promise<DockerContainerListResponse>
  controlContainer: (
    id: string,
    action: DockerContainerAction,
  ) => Promise<DockerContainerActionResponse>
}

type LuCIWindow = Window & {
  DockerGoLuci?: LuCIBridge
  L?: {
    env?: {
      sessionid?: string
    }
  }
}

type UbusResponse<T,> = {
  result?: [number, T?]
  error?: {
    code?: number
    message?: string
  }
}

function getLuCIWindow(): LuCIWindow | undefined {
  try {
    return window.parent as LuCIWindow
  } catch {
    return undefined
  }
}

async function callUbusDirectly<T>(
  luciWindow: LuCIWindow,
  method: string,
  parameters: Record<string, string> = {},
): Promise<T> {
  const sessionId =
    luciWindow.L?.env?.sessionid ||
    window.sessionStorage.getItem("dockergo.ubusSession")

  if (!sessionId) {
    throw new Error(
      "未检测到 LuCI 登录会话，请从 iStoreOS 的 DockerGo 菜单打开此页面。",
    )
  }

  const endpoint = import.meta.env.VITE_DOCKERGO_UBUS_URL || "/ubus"
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "call",
      params: [sessionId, "luci.dockergo", method, parameters],
    }),
  })

  if (!response.ok) {
    throw new Error(`DockerGo 接口请求失败（HTTP ${response.status}）`)
  }

  const payload = (await response.json()) as UbusResponse<T>
  if (payload.error) {
    throw new Error(
      payload.error.message || `ubus 错误 ${payload.error.code ?? "unknown"}`,
    )
  }

  const [status, result] = payload.result || []
  if (status !== 0 || !result) {
    throw new Error(`DockerGo ubus 调用失败（状态码 ${status ?? "unknown"}）`)
  }

  return result
}

export async function listDockerContainers(): Promise<DockerContainerListResponse> {
  const luciWindow = getLuCIWindow()
  if (luciWindow?.DockerGoLuci?.listContainers) {
    return luciWindow.DockerGoLuci.listContainers()
  }

  return callUbusDirectly<DockerContainerListResponse>(
    luciWindow || window as LuCIWindow,
    "list",
  )
}

export async function controlDockerContainer(
  id: string,
  action: DockerContainerAction,
): Promise<DockerContainerActionResponse> {
  const luciWindow = getLuCIWindow()
  if (luciWindow?.DockerGoLuci?.controlContainer) {
    return luciWindow.DockerGoLuci.controlContainer(id, action)
  }

  return callUbusDirectly<DockerContainerActionResponse>(
    luciWindow || window as LuCIWindow,
    "control",
    { id, action },
  )
}
