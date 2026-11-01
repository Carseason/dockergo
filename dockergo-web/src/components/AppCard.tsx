import { DownloadSimple } from "@phosphor-icons/react"
import type { CatalogApp } from "../types"

type AppCardProps = {
  app: CatalogApp
  onInstall: (app: CatalogApp) => void
}

export function AppCard({ app, onInstall }: AppCardProps) {
  const mark = Array.from(app.title.trim())[0]?.toLocaleUpperCase() || "?"

  return (
    <article className="app-card">
      <div className="app-logo app-logo--blue" aria-hidden="true">
        {mark}
      </div>
      <div className="app-card__body">
        <div className="app-card__heading">
          <div className="app-card__identity">
            <div className="app-card__name">
              <strong>{app.title}</strong>
            </div>
          </div>
        </div>
        <code className="app-card__id">{app.id}</code>
        <p className="app-card__image" title={app.image}>
          {app.image}
        </p>
        <p className="app-card__description" title={app.description}>
          {app.description}
        </p>
        <div className="app-card__tags" aria-label="应用标签">
          {app.tags.map((tag) => (
            <span className="category-label" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        {app.command.length > 0 && (
          <p className="app-card__stats">
            <span>自定义命令</span>
          </p>
        )}
        <div className="app-card__footer">
          <button
            type="button"
            className="install-button"
            onClick={() => onInstall(app)}
          >
            <DownloadSimple size={15} weight="bold" />
            安装
          </button>
        </div>
      </div>
    </article>
  )
}
