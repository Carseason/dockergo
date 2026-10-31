import {
  ArrowClockwise,
  MagnifyingGlass,
  SpinnerGap,
} from "@phosphor-icons/react"
import type {
  CatalogApp,
  DockerContainer,
  DockerContainerAction,
} from "../types"
import { AppCard } from "./AppCard"
import { ContainerCard } from "./ContainerCard"

const catalogTabs = ["已安装", "应用市场"]

type CatalogProps = {
  apps: CatalogApp[]
  containers: DockerContainer[]
  appsLoading: boolean
  containersLoading: boolean
  pendingContainerId: string
  activeTab: string
  onTabChange: (tab: string) => void
  onInstall: (app: CatalogApp) => void
  onRefreshApps: () => void
  onRefreshContainers: () => void
  onControlContainer: (id: string, action: DockerContainerAction) => void
  onInspectContainer: (container: DockerContainer) => void
  onShowContainerLogs: (container: DockerContainer) => void
  onRemoveContainer: (container: DockerContainer) => void
}

export function Catalog({
  apps,
  containers,
  appsLoading,
  containersLoading,
  pendingContainerId,
  activeTab,
  onTabChange,
  onInstall,
  onRefreshApps,
  onRefreshContainers,
  onControlContainer,
  onInspectContainer,
  onShowContainerLogs,
  onRemoveContainer,
}: CatalogProps) {
  const isInstalled = activeTab === "已安装"

  return (
    <section className="catalog" id="catalog">
      <div className="section-heading">
        <div>
          <h2>探索应用</h2>
          <p>为你的工作流选择合适的工具</p>
        </div>
        <button
          type="button"
          className="text-button refresh-button"
          onClick={isInstalled ? onRefreshContainers : onRefreshApps}
          disabled={isInstalled ? containersLoading : appsLoading}
        >
          <ArrowClockwise
            size={14}
            className={
              (isInstalled ? containersLoading : appsLoading)
                ? "is-spinning"
                : ""
            }
          />
          刷新
        </button>
      </div>

      <div className="category-tabs" aria-label="应用视图">
        {catalogTabs.map((tab) => (
          <button
            type="button"
            key={tab}
            className={activeTab === tab ? "active" : ""}
            aria-pressed={activeTab === tab}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {isInstalled ? (
        containersLoading ? (
          <div className="empty-state" role="status">
            <SpinnerGap className="is-spinning" size={28} />
            <strong>正在读取 Docker 容器</strong>
            <span>正在通过 iStoreOS 获取最新状态</span>
          </div>
        ) : containers.length > 0 ? (
          <div className="container-grid">
            {containers.map((container) => (
              <ContainerCard
                key={container.id}
                container={container}
                pending={pendingContainerId === container.id}
                onControl={onControlContainer}
                onInspect={onInspectContainer}
                onLogs={onShowContainerLogs}
                onRemove={onRemoveContainer}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state" role="status">
            <MagnifyingGlass size={28} />
            <strong>暂无 Docker 容器</strong>
            <span>设备上还没有创建任何容器</span>
          </div>
        )
      ) : appsLoading ? (
        <div className="empty-state" role="status">
          <SpinnerGap className="is-spinning" size={28} />
          <strong>正在加载应用市场</strong>
          <span>正在从 DockerGo 获取应用目录</span>
        </div>
      ) : apps.length > 0 ? (
        <div className="app-grid">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} onInstall={onInstall} />
          ))}
        </div>
      ) : (
        <div className="empty-state" role="status">
          <MagnifyingGlass size={28} />
          <strong>没有找到相关应用</strong>
          <span>尝试使用其他关键词或分类</span>
        </div>
      )}
    </section>
  )
}
