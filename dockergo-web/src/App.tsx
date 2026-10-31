import { useCallback, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Catalog } from "./components/Catalog"
import { ContainerDetailsDialog } from "./components/ContainerDetailsDialog"
import { Hero } from "./components/Hero"
import { InstallDialog } from "./components/InstallDialog"
import { Toast, type ToastVariant } from "./components/Toast"
import { apps } from "./data/apps"
import { useContainers } from "./hooks/useContainers"
import { useInstaller } from "./hooks/useInstaller"
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
  const [toast, setToast] = useState<ToastNotice | null>(null)

  const showToast = useCallback(
    (variant: ToastVariant, title: string, message: string) => {
      setToast({ id: Date.now(), variant, title, message })
    },
    [],
  )

  const dismissToast = useCallback(() => setToast(null), [])
  const handleContainerError = useCallback(
    (message: string, operation: "list" | "control") => {
      showToast(
        "error",
        operation === "list" ? "无法获取容器列表" : "容器操作失败",
        message,
      )
    },
    [showToast],
  )
  const handleDetailsError = useCallback(
    (message: string) => showToast("error", "无法读取容器详情", message),
    [showToast],
  )
  const closeDetails = useCallback(() => setDetailsContainer(null), [])

  const installer = useInstaller()
  const docker = useContainers(handleContainerError)

  const installedAppImages = useMemo(() => {
    const normalizeImage = (image: string) => {
      const withoutDigest = image.split("@", 1)[0]
      const lastSlash = withoutDigest.lastIndexOf("/")
      const lastColon = withoutDigest.lastIndexOf(":")
      const withoutTag =
        lastColon > lastSlash
          ? withoutDigest.slice(0, lastColon)
          : withoutDigest

      return withoutTag
        .replace(/^(?:docker\.io|index\.docker\.io)\//, "")
        .replace(/^library\//, "")
    }

    return new Set(
      docker.containers.map((container) => normalizeImage(container.image)),
    )
  }, [docker.containers])

  const announceInstallSuccess = useCallback(() => {
    if (!installer.lastInstalledApp) return
    showToast(
      "success",
      "部署任务已完成",
      `${installer.lastInstalledApp} 已成功安装并运行`,
    )
  }, [installer.lastInstalledApp, showToast])

  const closeInstaller = useCallback(() => {
    if (installer.phase === "complete") announceInstallSuccess()
    installer.closeInstaller()
  }, [announceInstallSuccess, installer.closeInstaller, installer.phase])

  const showInstalledApps = useCallback(() => {
    announceInstallSuccess()
    installer.closeInstaller()
    setActiveTab("已安装")
    void docker.refresh()
  }, [announceInstallSuccess, docker.refresh, installer.closeInstaller])

  const selectTab = (tab: string) => {
    setActiveTab(tab)
    if (tab === "已安装") void docker.refresh()
  }

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
          phase={installer.phase}
          configuration={installer.configuration}
          logs={installer.logs}
          onConfigurationChange={installer.updateConfiguration}
          onInstall={installer.startInstallation}
          onClose={closeInstaller}
          onShowInstalled={showInstalledApps}
        />
      )}

      {detailsContainer && (
        <ContainerDetailsDialog
          container={detailsContainer}
          onClose={closeDetails}
          onError={handleDetailsError}
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
              apps={apps}
              containers={docker.containers}
              installedAppImages={installedAppImages}
              containersLoading={docker.loading}
              pendingContainerId={docker.pendingContainerId}
              activeTab={activeTab}
              onTabChange={selectTab}
              onInstall={installer.openInstaller}
              onRefreshContainers={() => void docker.refresh()}
              onControlContainer={(id, action) =>
                void docker.control(id, action)
              }
              onInspectContainer={setDetailsContainer}
            />
          </div>
        </main>
      </div>
      {createPortal(overlays, overlayRoot)}
    </>
  )
}
