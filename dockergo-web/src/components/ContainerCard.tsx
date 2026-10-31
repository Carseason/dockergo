import { Cube, HardDrives } from "@phosphor-icons/react"
import type { DockerContainer } from "../types"

function getStateLabel(state: string) {
  const labels: Record<string, string> = {
    created: "已创建",
    running: "运行中",
    paused: "已暂停",
    restarting: "重启中",
    removing: "删除中",
    exited: "已停止",
    dead: "异常",
  }

  return labels[state.toLowerCase()] || state || "未知"
}

export function ContainerCard({ container }: { container: DockerContainer }) {
  const state = container.state.toLowerCase() || "unknown"

  return (
    <article className="container-card">
      <div className="container-card__icon" aria-hidden="true">
        <Cube size={24} weight="duotone" />
      </div>
      <div className="container-card__body">
        <div className="container-card__heading">
          <div>
            <strong title={container.name}>
              {container.name || container.id.slice(0, 12)}
            </strong>
            <span className={`container-state container-state--${state}`}>
              <i aria-hidden="true" />
              {getStateLabel(container.state)}
            </span>
          </div>
          <code title={container.id}>{container.id.slice(0, 12)}</code>
        </div>
        <p className="container-card__image" title={container.image}>
          {container.image}
        </p>
        <p className="container-card__status">
          {container.status || container.runningFor}
        </p>
        <div className="container-card__meta">
          <span>
            <HardDrives size={14} />
            {container.ports || "未暴露端口"}
          </span>
          {container.networks && <span>{container.networks}</span>}
        </div>
      </div>
    </article>
  )
}
