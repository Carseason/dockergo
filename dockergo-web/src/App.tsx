import { MagnifyingGlass } from "@phosphor-icons/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Catalog } from "./components/Catalog"
import { ContainerDetailsDialog } from "./components/ContainerDetailsDialog"
import { Hero } from "./components/Hero"
import { InstallDialog } from "./components/InstallDialog"
import { Toast } from "./components/Toast"
import { apps } from "./data/apps"
import { useContainers } from "./hooks/useContainers"
import { useInstaller } from "./hooks/useInstaller"
import type { DockerContainer } from "./types"

export default function App() {
  const [activeCategory, setActiveCategory] = useState("已安装")
  const [query, setQuery] = useState("")
  const [detailsContainer, setDetailsContainer] =
    useState<DockerContainer | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
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

  const filteredApps = useMemo(
    () =>
      apps.filter(
        (app) =>
          (activeCategory === "全部" || app.category === activeCategory) &&
          `${app.name}${app.description}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
      ),
    [activeCategory, query],
  )

  const filteredContainers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return docker.containers

    return docker.containers.filter((container) =>
      `${container.name}${container.image}${container.status}${container.ports}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    )
  }, [docker.containers, query])

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }

    document.addEventListener("keydown", focusSearch)
    return () => document.removeEventListener("keydown", focusSearch)
  }, [])

  const showInstalledApps = () => {
    installer.closeInstaller()
    setActiveCategory("已安装")
    void docker.refresh()
  }

  const selectCategory = (category: string) => {
    setActiveCategory(category)
    if (category === "已安装") void docker.refresh()
  }

  const browseAllApps = () => {
    setActiveCategory("全部")
    document
      .getElementById("catalog")
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
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
          <label className="search-box">
            <MagnifyingGlass size={18} />
            <span className="sr-only">搜索应用</span>
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索应用..."
            />
            <kbd>⌘ K</kbd>
          </label>
        </header>

        <div className="content">
          <Hero onBrowse={browseAllApps} />

          <Catalog
            apps={filteredApps}
            containers={filteredContainers}
            installedAppImages={installedAppImages}
            containersLoading={docker.loading}
            containersError={docker.error}
            pendingContainerId={docker.pendingContainerId}
            containerActionError={docker.actionError}
            activeCategory={activeCategory}
            onCategoryChange={selectCategory}
            onInstall={installer.openInstaller}
            onRefreshContainers={() => void docker.refresh()}
            onControlContainer={(id, action) => void docker.control(id, action)}
            onInspectContainer={setDetailsContainer}
          />
        </div>
      </main>

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
    </div>
  )
}
