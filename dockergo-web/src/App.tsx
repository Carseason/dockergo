import { useCallback, useState } from "react"
import { createPortal } from "react-dom"
import { Catalog } from "./components/Catalog"
import { ContainerDetailsDialog } from "./components/ContainerDetailsDialog"
import { ContainerLogsDialog } from "./components/ContainerLogsDialog"
import { Hero } from "./components/Hero"
import { InstallDialog } from "./components/InstallDialog"
import { RemoveContainerDialog } from "./components/RemoveContainerDialog"
import { Toast, type ToastVariant } from "./components/Toast"
import { useCatalog } from "./hooks/useCatalog"
import { useContainers } from "./hooks/useContainers"
import { useInstaller } from "./hooks/useInstaller"
import { showSystemTaskLog } from "./systemTasks"
import type { DockerContainer } from "./types"

type ToastNotice = {
  id: number
  variant: ToastVariant
  title: string
  message: string
}

export default function App({ overlayRoot }: { overlayRoot: HTMLElement }) {
  const [activeTab, setActiveTab] = useState("已安装")
  const [detailsContainer, setDetailsContainer] =
    useState<DockerContainer | null>(null)
  const [logsContainer, setLogsContainer] = useState<DockerContainer | null>(
    null,
  )
  const [removeContainer, setRemoveContainer] =
    useState<DockerContainer | null>(null)
  const [toast, setToast] = useState<ToastNotice | null>(null)

  const showToast = useCallback(
    (variant: ToastVariant, title: string, message: string) => {
      setToast({ id: Date.now(), variant, title, message })
    },
    [],
  )

  const dismissToast = useCallback(() => setToast(null), [])
  const handleContainerError = useCallback(
    (message: string, operation: "list" | "control" | "remove") => {
      showToast(
        "error",
        operation === "list"
          ? "无法获取容器列表"
          : operation === "remove"
            ? "容器卸载失败"
            : "容器操作失败",
        message,
      )
    },
    [showToast],
  )
  const handleDetailsError = useCallback(
    (message: string) => showToast("error", "无法读取容器详情", message),
    [showToast],
  )
  const handleLogsError = useCallback(
    (message: string) => showToast("error", "无法读取容器日志", message),
    [showToast],
  )
  const handleCatalogError = useCallback(
    (message: string) => showToast("error", "无法获取应用市场", message),
    [showToast],
  )
  const handleDirectoryError = useCallback(
    (message: string) => showToast("error", "无法选择映射目录", message),
    [showToast],
  )
  const closeDetails = useCallback(() => setDetailsContainer(null), [])
  const closeLogs = useCallback(() => setLogsContainer(null), [])
  const closeRemove = useCallback(() => setRemoveContainer(null), [])

  const installer = useInstaller()
  const docker = useContainers(handleContainerError)
  const catalog = useCatalog(handleCatalogError)

  const confirmInstallation = useCallback(async () => {
    try {
      const task = await installer.startInstallation()
      if (!task) return

      showSystemTaskLog(task.taskId, (exitCode) => {
        setActiveTab("已安装")
        void docker.refresh()

        if (exitCode === 0) {
          showToast(
            "success",
            !task.startNow
              ? "应用已创建"
              : task.d
                ? "容器已启动"
                : "本次运行已结束",
            !task.startNow
              ? `${task.appTitle} 已创建为容器 ${task.containerName}，尚未启动`
              : task.d
                ? `${task.appTitle} 已在后台启动${
                    task.rm ? "，退出后自动清理" : ""
                  }`
                : `${task.appTitle} 本次运行已结束${
                    task.rm
                      ? "，容器已自动清理"
                      : "，容器已保留；后续是否重启取决于重启策略"
                  }`,
          )
        } else {
          showToast(
            "error",
            "部署或运行失败",
            `${task.appTitle} 任务退出，错误码 ${exitCode}，请查看系统任务日志`,
          )
        }
      })
    } catch (installError) {
      showToast(
        "error",
        "无法启动安装任务",
        installError instanceof Error ? installError.message : "应用安装失败",
      )
    }
  }, [docker.refresh, installer.startInstallation, showToast])

  const confirmRemoveContainer = useCallback(async () => {
    if (!removeContainer) return

    const removed = await docker.remove(removeContainer.id)
    if (!removed) return

    const name = removeContainer.name || removeContainer.id.slice(0, 12)
    setRemoveContainer(null)
    showToast("success", "容器已卸载", `${name} 已从设备中移除`)
  }, [docker.remove, removeContainer, showToast])

  const browseAllApps = () => {
    setActiveTab("应用市场")
    document
      .getElementById("catalog")
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const overlays = (
    <>
      {installer.selectedApp && installer.configuration && (
        <InstallDialog
          app={installer.selectedApp}
          configuration={installer.configuration}
          submitting={installer.submitting}
          onConfigurationChange={installer.updateConfiguration}
          onError={handleDirectoryError}
          onInstall={() => void confirmInstallation()}
          onClose={installer.closeInstaller}
        />
      )}

      {detailsContainer && (
        <ContainerDetailsDialog
          container={detailsContainer}
          onClose={closeDetails}
          onError={handleDetailsError}
        />
      )}

      {logsContainer && (
        <ContainerLogsDialog
          container={logsContainer}
          onClose={closeLogs}
          onError={handleLogsError}
        />
      )}

      {removeContainer && (
        <RemoveContainerDialog
          container={removeContainer}
          pending={docker.pendingContainerId === removeContainer.id}
          onClose={closeRemove}
          onConfirm={() => void confirmRemoveContainer()}
        />
      )}

      {toast && (
        <Toast
          key={toast.id}
          variant={toast.variant}
          title={toast.title}
          message={toast.message}
          onDismiss={dismissToast}
        />
      )}
    </>
  )

  return (
    <>
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          跳到主要内容
        </a>
        <main id="main-content">
          <header className="topbar">
            <div>
              <h1>应用商店</h1>
              <p>发现并快速部署你需要的服务</p>
            </div>
          </header>

          <div className="content">
            <Hero onBrowse={browseAllApps} />

            <Catalog
              apps={catalog.apps}
              containers={docker.containers}
              appsLoading={catalog.loading}
              containersLoading={docker.loading}
              pendingContainerId={docker.pendingContainerId}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onInstall={installer.openInstaller}
              onRefreshApps={() => void catalog.refresh()}
              onRefreshContainers={() => void docker.refresh()}
              onControlContainer={(id, action) =>
                void docker.control(id, action)
              }
              onInspectContainer={setDetailsContainer}
              onShowContainerLogs={setLogsContainer}
              onRemoveContainer={setRemoveContainer}
            />
          </div>
        </main>
      </div>
      {createPortal(overlays, overlayRoot)}
    </>
  )
}
