import {
  ArrowClockwise,
  MagnifyingGlass,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react"
import { categories } from "../data/apps"
import type {
  CatalogApp,
  DockerContainer,
  DockerContainerAction,
} from "../types"
import { AppCard } from "./AppCard"
import { ContainerCard } from "./ContainerCard"

type CatalogProps = {
  apps: CatalogApp[]
  containers: DockerContainer[]
  installedAppImages: Set<string>
  containersLoading: boolean
  containersError: string
  pendingContainerId: string
  containerActionError: {
    id: string
    message: string
  }
  activeCategory: string
  onCategoryChange: (category: string) => void
  onInstall: (app: CatalogApp) => void
  onRefreshContainers: () => void
  onControlContainer: (id: string, action: DockerContainerAction) => void
  onInspectContainer: (container: DockerContainer) => void
}

export function Catalog({
  apps,
  containers,
  installedAppImages,
  containersLoading,
  containersError,
  pendingContainerId,
  containerActionError,
  activeCategory,
  onCategoryChange,
  onInstall,
  onRefreshContainers,
  onControlContainer,
  onInspectContainer,
}: CatalogProps) {
  const isInstalled = activeCategory === "已安装"

  return (
    <section className="catalog" id="catalog">
      <div className="section-heading">
        <div>
          <h2>探索应用</h2>
          <p>为你的工作流选择合适的工具</p>
        </div>
        {isInstalled ? (
          <button
            type="button"
            className="text-button refresh-button"
            onClick={onRefreshContainers}
            disabled={containersLoading}
          >
            <ArrowClockwise
              size={14}
              className={containersLoading ? "is-spinning" : ""}
            />
            刷新
          </button>
        ) : activeCategory !== "全部" ? (
          <button
            type="button"
            className="text-button"
            onClick={() => onCategoryChange("全部")}
          >
            清除筛选
          </button>
        ) : null}
      </div>

      <div className="category-tabs" aria-label="应用分类">
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            className={activeCategory === category ? "active" : ""}
            aria-pressed={activeCategory === category}
            onClick={() => onCategoryChange(category)}
          >
            {category}
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
        ) : containersError ? (
          <div className="empty-state empty-state--error" role="alert">
            <WarningCircle size={28} />
            <strong>无法获取容器列表</strong>
            <span>{containersError}</span>
            <button
              type="button"
              className="retry-button"
              onClick={onRefreshContainers}
            >
              重试
            </button>
          </div>
        ) : containers.length > 0 ? (
          <div className="container-grid">
            {containers.map((container) => (
              <ContainerCard
                key={container.id}
                container={container}
                pending={pendingContainerId === container.id}
                actionError={
                  containerActionError.id === container.id
                    ? containerActionError.message
                    : ""
                }
                onControl={onControlContainer}
                onInspect={onInspectContainer}
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
      ) : apps.length > 0 ? (
        <div className="app-grid">
          {apps.map((app) => (
            <AppCard
              key={app.name}
              app={app}
              installed={installedAppImages.has(app.image)}
              onInstall={onInstall}
            />
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
