import { Check, DownloadSimple } from "@phosphor-icons/react"
import type { CatalogApp } from "../types"

type AppCardProps = {
  app: CatalogApp
  installed: boolean
  managementMode: boolean
  onInstall: (app: CatalogApp) => void
}

export function AppCard({
  app,
  installed,
  managementMode,
  onInstall,
}: AppCardProps) {
  const actionLabel = managementMode ? "管理" : installed ? "已安装" : "安装"

  return (
    <article className="app-card">
      <div className={`app-logo app-logo--${app.color}`} aria-hidden="true">
        {app.mark}
      </div>
      <div className="app-card__body">
        <div className="app-card__heading">
          <div className="app-card__identity">
            <div className="app-card__name">
              <strong>{app.name}</strong>
              {app.verified && (
                <span className="verified-badge" title="官方验证">
                  <Check size={10} weight="bold" />
                  <span className="sr-only">官方验证</span>
                </span>
              )}
            </div>
            <span className="category-label">{app.category}</span>
          </div>
          <button
            type="button"
            className={`install-button ${
              installed ? "install-button--installed" : ""
            }`}
            onClick={() => onInstall(app)}
            disabled={installed}
            title={managementMode ? "应用管理功能将在后续版本开放" : undefined}
          >
            {actionLabel}
          </button>
        </div>
        <p>{app.description}</p>
        <div className="app-card__meta">
          <span>
            <DownloadSimple size={14} />
            {app.downloads}
          </span>
          <span>v{app.version}</span>
        </div>
      </div>
    </article>
  )
}
