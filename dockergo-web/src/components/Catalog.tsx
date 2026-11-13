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
  tags: string[]
  containers: DockerContainer[]
  appsLoading: boolean
  containersLoading: boolean
  pendingContainerId: string
  activeTab: string
  activeTag: string
  onTabChange: (tab: string) => void
  onTagChange: (tag: string) => void
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
  tags,
  containers,
  appsLoading,
  containersLoading,
  pendingContainerId,
  activeTab,
  activeTag,
  onTabChange,
  onTagChange,
  onInstall,
  onRefreshApps,
  onRefreshContainers,
  onControlContainer,
  onInspectContainer,
  onShowContainerLogs,
  onRemoveContainer,
}: CatalogProps) {
  const isInstalled = activeTab === "已安装"
  const visibleApps = activeTag
    ? apps.filter((app) => app.tags.includes(activeTag))
    : apps
  const installedContainers = containers.filter(
    (container) => container.managed || Boolean(container.appId),
  )

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

      {!isInstalled && (
        <div className="market-tags" role="group" aria-label="应用标签筛选">
          <button
            type="button"
            className={!activeTag ? "active" : ""}
            aria-pressed={!activeTag}
            onClick={() => onTagChange("")}
          >
            全部
          </button>
          {tags.map((tag) => (
            <button
              type="button"
              key={tag}
              className={activeTag === tag ? "active" : ""}
              aria-pressed={activeTag === tag}
              onClick={() => onTagChange(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {isInstalled ? (
        containersLoading ? (
          <div className="empty-state" role="status">
            <SpinnerGap className="is-spinning" size={28} />
            <strong>正在读取 Docker 容器</strong>
            <span>正在通过 iStoreOS 获取最新状态</span>
          </div>
        ) : installedContainers.length > 0 ? (
          <div className="container-grid">
            {installedContainers.map((container) => (
              <ContainerCard
                key={container.id}
                container={container}
                catalogApp={apps.find((app) => app.id === container.appId)}
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
            <strong>暂无已安装应用</strong>
            <span>尚未通过 DockerGo 创建任何容器</span>
          </div>
        )
      ) : appsLoading ? (
        <div className="empty-state" role="status">
          <SpinnerGap className="is-spinning" size={28} />
          <strong>正在加载应用市场</strong>
          <span>正在从 DockerGo 获取应用目录</span>
        </div>
      ) : visibleApps.length > 0 ? (
        <div className="app-grid">
          {visibleApps.map((app) => (
            <AppCard key={app.id} app={app} onInstall={onInstall} />
          ))}
        </div>
      ) : (
        <div className="empty-state" role="status">
          <MagnifyingGlass size={28} />
          <strong>
            {activeTag ? "没有符合该标签的应用" : "应用市场暂无可用应用"}
          </strong>
          <span>
            {activeTag
              ? `当前标签：${activeTag}，可选择“全部”查看其他应用`
              : "请稍后刷新应用目录"}
          </span>
        </div>
      )}
    </section>
  )
}
