import { useCallback, useEffect, useState } from "react"
import type { CatalogApp, InstallConfiguration, InstallPhase } from "../types"

const initialInstalledApps = ["Redis", "Uptime Kuma"]

function getDefaultConfiguration(app: CatalogApp): InstallConfiguration {
  return {
    hostPort: app.defaultPort,
    containerPort: app.defaultPort,
    dataDirectory: `/docker/apps/${app.name.toLowerCase().replaceAll(" ", "-")}`,
    autoStart: true,
    autoUpdate: true,
  }
}

export function useInstaller() {
  const [selectedApp, setSelectedApp] = useState<CatalogApp | null>(null)
  const [installedApps, setInstalledApps] = useState(initialInstalledApps)
  const [phase, setPhase] = useState<InstallPhase>("configure")
  const [configuration, setConfiguration] =
    useState<InstallConfiguration | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [lastInstalledApp, setLastInstalledApp] = useState("")

  const openInstaller = useCallback((app: CatalogApp) => {
    setSelectedApp(app)
    setConfiguration(getDefaultConfiguration(app))
    setPhase("configure")
    setLogs([])
  }, [])

  const closeInstaller = useCallback(() => {
    if (phase !== "installing") setSelectedApp(null)
  }, [phase])

  const updateConfiguration = useCallback(
    (patch: Partial<InstallConfiguration>) => {
      setConfiguration((current) =>
        current ? { ...current, ...patch } : current,
      )
    },
    [],
  )

  const startInstallation = useCallback(() => {
    if (!selectedApp || !configuration) return
    setPhase("installing")
    setLogs([`[准备] 正在验证 ${selectedApp.name} 的安装配置...`])
  }, [configuration, selectedApp])

  useEffect(() => {
    if (phase !== "installing" || !selectedApp || !configuration) return

    const containerName = selectedApp.name.toLowerCase().replaceAll(" ", "-")
    const messages = [
      `[镜像] 拉取 ${selectedApp.name}:${selectedApp.version}`,
      "[镜像] 校验镜像完整性... 完成",
      `[存储] 挂载 ${configuration.dataDirectory}`,
      `[网络] 映射端口 0.0.0.0:${configuration.hostPort} -> ${configuration.containerPort}/tcp`,
      "[容器] 创建专用网络 dockergo_default",
      `[容器] 启动 ${containerName}`,
      "[检查] 等待应用健康检查...",
      `[完成] ${selectedApp.name} 已成功安装并运行`,
    ]

    const timers = messages.map((message, index) =>
      window.setTimeout(
        () => {
          setLogs((current) => [...current, message])
          if (index === messages.length - 1) {
            setInstalledApps((current) => [
              ...new Set([...current, selectedApp.name]),
            ])
            setLastInstalledApp(selectedApp.name)
            setPhase("complete")
          }
        },
        (index + 1) * 520,
      ),
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [configuration, phase, selectedApp])

  return {
    selectedApp,
    installedApps,
    phase,
    configuration,
    logs,
    lastInstalledApp,
    openInstaller,
    closeInstaller,
    updateConfiguration,
    startInstallation,
  }
}
