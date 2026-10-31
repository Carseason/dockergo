import { useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Catalog } from "./components/Catalog"
import { ContainerDetailsDialog } from "./components/ContainerDetailsDialog"
import { Hero } from "./components/Hero"
import { InstallDialog } from "./components/InstallDialog"
import { Toast } from "./components/Toast"
import { apps } from "./data/apps"
import { useContainers } from "./hooks/useContainers"
import { useInstaller } from "./hooks/useInstaller"
import type { DockerContainer } from "./types"

export default function App({ overlayRoot }: { overlayRoot: HTMLElement }) {
  const [activeTab, setActiveTab] = useState("已安装")
  const [detailsContainer, setDetailsContainer] =
    useState<DockerContainer | null>(null)
  const installer = useInstaller()
  const docker = useContainers()

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

  const showInstalledApps = () => {
    installer.closeInstaller()
    setActiveTab("已安装")
    void docker.refresh()
  }

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
          onClose={installer.closeInstaller}
          onShowInstalled={showInstalledApps}
        />
      )}

      {detailsContainer && (
        <ContainerDetailsDialog
          container={detailsContainer}
          onClose={() => setDetailsContainer(null)}
        />
      )}

      {installer.lastInstalledApp &&
        installer.phase === "complete" &&
        !installer.selectedApp && (
          <Toast appName={installer.lastInstalledApp} />
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
              containersError={docker.error}
              pendingContainerId={docker.pendingContainerId}
              containerActionError={docker.actionError}
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
