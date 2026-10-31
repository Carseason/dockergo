import { Check, DownloadSimple, HardDrives } from "@phosphor-icons/react"
import type { CatalogApp } from "../types"

type AppCardProps = {
  app: CatalogApp
  installed: boolean
  onInstall: (app: CatalogApp) => void
}

export function AppCard({ app, installed, onInstall }: AppCardProps) {
  const actionLabel = installed ? "已安装" : "安装"
  const mark = Array.from(app.title.trim())[0]?.toLocaleUpperCase() || "?"
  const environmentCount = Object.keys(app.environment).length

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
        </div>
        <code className="app-card__id">{app.id}</code>
        <p className="app-card__image" title={app.image}>
          {app.image}
        </p>
        <p className="app-card__description">{app.description}</p>
        <p className="app-card__stats">
          <span>
            <strong>{app.ports.length}</strong> 个端口
          </span>
          <span>
            <strong>{app.volumes.length}</strong> 个存储
          </span>
          <span>
            <strong>{environmentCount}</strong> 个变量
          </span>
          {app.command.length > 0 && <span>自定义命令</span>}
        </p>
        <div className="app-card__footer">
          <div className="app-card__ports">
            <HardDrives size={15} aria-hidden="true" />
            {app.ports.length > 0
              ? app.ports.map((port) => (
                  <span
                    className="app-card__port"
                    key={`${port.host}-${port.container}`}
                    title={`宿主机端口 ${port.host} 映射到容器端口 ${port.container}/tcp`}
                  >
                    {port.host} → {port.container}
                    {port.web && <small>Web</small>}
                  </span>
                ))
              : "无端口映射"}
          </div>
          <button
            type="button"
            className={`install-button ${
              installed ? "install-button--installed" : ""
            }`}
            onClick={() => onInstall(app)}
            disabled={installed}
          >
            {installed ? (
              <Check size={15} weight="bold" />
            ) : (
              <DownloadSimple size={15} weight="bold" />
            )}
            {actionLabel}
          </button>
        </div>
      </div>
    </article>
  )
}
