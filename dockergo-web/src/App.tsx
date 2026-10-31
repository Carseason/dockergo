import { MagnifyingGlass } from "@phosphor-icons/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Catalog } from "./components/Catalog"
import { Hero } from "./components/Hero"
import { InstallDialog } from "./components/InstallDialog"
import { Toast } from "./components/Toast"
import { apps } from "./data/apps"
import { useInstaller } from "./hooks/useInstaller"
import type { StoreView } from "./types"

export default function App() {
  const [view, setView] = useState<StoreView>("market")
  const [activeCategory, setActiveCategory] = useState("全部")
  const [query, setQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const installer = useInstaller()

  const filteredApps = useMemo(
    () =>
      apps.filter(
        (app) =>
          (view === "market" || installer.installedApps.includes(app.name)) &&
          (activeCategory === "全部" || app.category === activeCategory) &&
          `${app.name}${app.description}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
      ),
    [activeCategory, installer.installedApps, query, view],
  )

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
    setView("installed")
    setActiveCategory("全部")
  }

  const browseAllApps = () => {
    setView("market")
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
          <div className="store-tabs" aria-label="应用商店视图">
            <button
              type="button"
              className={view === "market" ? "active" : ""}
              aria-pressed={view === "market"}
              onClick={() => setView("market")}
            >
              应用市场
            </button>
            <button
              type="button"
              className={view === "installed" ? "active" : ""}
              aria-pressed={view === "installed"}
              onClick={() => setView("installed")}
            >
              已安装 <span>{installer.installedApps.length}</span>
            </button>
          </div>

          {view === "market" && <Hero onBrowse={browseAllApps} />}

          <Catalog
            apps={filteredApps}
            view={view}
            installedApps={installer.installedApps}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            onInstall={installer.openInstaller}
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

      {installer.lastInstalledApp &&
        installer.phase === "complete" &&
        !installer.selectedApp && (
          <Toast appName={installer.lastInstalledApp} />
        )}
    </div>
  )
}
