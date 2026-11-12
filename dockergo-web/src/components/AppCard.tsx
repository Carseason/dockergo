import { DownloadSimple, Play } from "@phosphor-icons/react"
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
              <span className="app-card__version">v{app.version}</span>
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
        {app.rm || !app.d ? (
          <p className="app-card__stats">
            <span>{app.rm ? "退出后自动清理" : "前台运行"}</span>
          </p>
        ) : app.command.length > 0 ? (
          <p className="app-card__stats">
            <span>自定义命令</span>
          </p>
        ) : null}
        <div className="app-card__footer">
          <button
            type="button"
            className="install-button"
            onClick={() => onInstall(app)}
          >
            {app.rm || !app.d ? (
              <Play size={15} weight="fill" />
            ) : (
              <DownloadSimple size={15} weight="bold" />
            )}
            {app.rm || !app.d ? "运行" : "安装"}
          </button>
        </div>
      </div>
    </article>
  )
}
