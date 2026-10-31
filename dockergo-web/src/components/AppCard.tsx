import type { CatalogApp } from "../types"

type AppCardProps = {
  app: CatalogApp
  installed: boolean
  onInstall: (app: CatalogApp) => void
}

export function AppCard({ app, installed, onInstall }: AppCardProps) {
  const actionLabel = installed ? "已安装" : "安装"
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
            <div className="app-card__tags" aria-label="应用标签">
              {app.tags.map((tag) => (
                <span className="category-label" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            className={`install-button ${
              installed ? "install-button--installed" : ""
            }`}
            onClick={() => onInstall(app)}
            disabled={installed}
          >
            {actionLabel}
          </button>
        </div>
        <p>{app.description}</p>
      </div>
    </article>
  )
}
