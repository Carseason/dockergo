import { MagnifyingGlass } from "@phosphor-icons/react"
import { categories } from "../data/apps"
import type { CatalogApp, StoreView } from "../types"
import { AppCard } from "./AppCard"

type CatalogProps = {
  apps: CatalogApp[]
  view: StoreView
  installedApps: string[]
  activeCategory: string
  onCategoryChange: (category: string) => void
  onInstall: (app: CatalogApp) => void
}

export function Catalog({
  apps,
  view,
  installedApps,
  activeCategory,
  onCategoryChange,
  onInstall,
}: CatalogProps) {
  const isMarket = view === "market"

  return (
    <section
      className={`catalog ${isMarket ? "" : "catalog--installed"}`}
      id="catalog"
    >
      <div className="section-heading">
        <div>
          <h2>{isMarket ? "探索应用" : "已安装应用"}</h2>
          <p>
            {isMarket
              ? "为你的工作流选择合适的工具"
              : `${installedApps.length} 个应用正在此设备上运行`}
          </p>
        </div>
        {isMarket && activeCategory !== "全部" && (
          <button
            type="button"
            className="text-button"
            onClick={() => onCategoryChange("全部")}
          >
            清除筛选
          </button>
        )}
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

      {apps.length > 0 ? (
        <div className="app-grid">
          {apps.map((app) => (
            <AppCard
              key={app.name}
              app={app}
              installed={installedApps.includes(app.name)}
              managementMode={!isMarket}
              onInstall={onInstall}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state" role="status">
          <MagnifyingGlass size={28} />
          <strong>{isMarket ? "没有找到相关应用" : "暂无已安装应用"}</strong>
          <span>
            {isMarket
              ? "尝试使用其他关键词或分类"
              : "前往应用市场选择并安装应用"}
          </span>
        </div>
      )}
    </section>
  )
}
