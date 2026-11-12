import {
  ArrowSquareOut,
  DotsThreeVertical,
  FileText,
  HardDrives,
  Info,
  Pause,
  Play,
  SpinnerGap,
  Trash,
} from "@phosphor-icons/react"
import { useEffect, useRef, useState } from "react"
import type {
  CatalogApp,
  DockerContainer,
  DockerContainerAction,
} from "../types"

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

function getContainerInitial(container: DockerContainer) {
  const source = container.name.trim() || container.id

  return Array.from(source)[0]?.toLocaleUpperCase() || "?"
}

type PublishedPort = {
  hostPort: string
  containerPort: string
  protocol: string
}

function getPublishedPorts(ports: string): PublishedPort[] {
  const published = new Map<string, PublishedPort>()

  for (const value of ports.split(",")) {
    const match = value.trim().match(/:(\d+)->(\d+)\/(tcp|udp)$/i)
    if (!match) continue

    const port = {
      hostPort: match[1],
      containerPort: match[2],
      protocol: match[3].toLowerCase(),
    }
    published.set(`${port.hostPort}/${port.protocol}`, port)
  }

  return [...published.values()]
}

function getPortUrl(hostPort: string) {
  const hostname = window.location.hostname.includes(":")
    ? `[${window.location.hostname}]`
    : window.location.hostname
  return `http://${hostname}:${hostPort}`
}

function getContainerAction(state: string, taskMode: boolean): {
  action: DockerContainerAction
  label: string
} | null {
  switch (state) {
    case "running":
      return { action: "pause", label: "暂停" }
    case "paused":
      return { action: "unpause", label: "继续" }
    case "created":
      return { action: "start", label: taskMode ? "运行" : "启动" }
    case "exited":
    case "dead":
      return { action: "start", label: taskMode ? "再次运行" : "启动" }
    default:
      return null
  }
}

type ContainerCardProps = {
  container: DockerContainer
  catalogApp?: CatalogApp
  pending: boolean
  onControl: (id: string, action: DockerContainerAction) => void
  onInspect: (container: DockerContainer) => void
  onLogs: (container: DockerContainer) => void
  onRemove: (container: DockerContainer) => void
}

export function ContainerCard({
  container,
  catalogApp,
  pending,
  onControl,
  onInspect,
  onLogs,
  onRemove,
}: ContainerCardProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const state = container.state.toLowerCase() || "unknown"
  const control = getContainerAction(
    state,
    Boolean(catalogApp && (!catalogApp.d || catalogApp.rm)),
  )
  const publishedPorts = getPublishedPorts(container.ports)
  const initial = getContainerInitial(container)
  const hasVersionChange = Boolean(
    catalogApp &&
      container.appVersion &&
      container.appVersion !== catalogApp.version,
  )

  useEffect(() => {
    if (!menuOpen) return

    const closeMenu = (event: PointerEvent) => {
      if (!menuRef.current || !event.composedPath().includes(menuRef.current)) {
        setMenuOpen(false)
      }
    }
    const closeMenuWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }

    document.addEventListener("pointerdown", closeMenu)
    document.addEventListener("keydown", closeMenuWithKeyboard)
    return () => {
      document.removeEventListener("pointerdown", closeMenu)
      document.removeEventListener("keydown", closeMenuWithKeyboard)
    }
  }, [menuOpen])

  const selectMenuAction = (action: () => void) => {
    setMenuOpen(false)
    action()
  }

  return (
    <article className="container-card">
      <div className="container-card__icon" aria-hidden="true">
        {initial}
      </div>
      <div className="container-card__body">
        <div className="container-card__heading">
          <div>
            <strong title={container.name}>
              {catalogApp?.title || container.name || container.id.slice(0, 12)}
            </strong>
            {container.appVersion && (
              <span className="container-card__version">
                v{container.appVersion}
              </span>
            )}
            <span className={`container-state container-state--${state}`}>
              <i aria-hidden="true" />
              {getStateLabel(container.state)}
            </span>
          </div>
          <div className="container-more" ref={menuRef}>
            <button
              type="button"
              className="container-more__trigger"
              aria-label={`打开 ${container.name || "容器"} 的更多选项`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={pending}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <DotsThreeVertical size={20} weight="bold" />
            </button>
            {menuOpen && (
              <div className="container-more__menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => selectMenuAction(() => onInspect(container))}
                >
                  <Info size={16} />
                  详情
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => selectMenuAction(() => onLogs(container))}
                >
                  <FileText size={16} />
                  日志
                </button>
                <button
                  type="button"
                  className="container-more__danger"
                  role="menuitem"
                  onClick={() => selectMenuAction(() => onRemove(container))}
                >
                  <Trash size={16} />
                  卸载
                </button>
              </div>
            )}
          </div>
        </div>
        {hasVersionChange && catalogApp && (
          <p
            className="container-card__update"
            role="note"
            aria-label="市场版本更新提醒"
            title="市场目录版本与当前安装版本不同；此提示不代表已检查远端镜像更新。"
          >
            <strong>版本更新提醒</strong>
            <span>
              已安装 {container.appVersion} · 市场 {catalogApp.version}
            </span>
          </p>
        )}
        <code className="container-card__id" title={container.id}>
          {container.id.slice(0, 12)}
        </code>
        <p className="container-card__image" title={container.image}>
          {container.image}
        </p>
        <p className="container-card__status">
          {container.status || container.runningFor}
          {container.networks && <span> · {container.networks}</span>}
        </p>
        <div className="container-card__footer">
          <div className="container-card__ports">
            <HardDrives size={15} aria-hidden="true" />
            {publishedPorts.length > 0
              ? publishedPorts.map((port) =>
                  port.protocol === "tcp" ? (
                    <a
                      key={`${port.hostPort}/${port.protocol}`}
                      href={getPortUrl(port.hostPort)}
                      target="_blank"
                      rel="noreferrer"
                      title={`打开宿主机端口 ${port.hostPort}`}
                    >
                      {port.hostPort}
                      <ArrowSquareOut size={12} />
                    </a>
                  ) : (
                    <span
                      className="container-card__port-label"
                      key={`${port.hostPort}/${port.protocol}`}
                      title={`${port.containerPort}/${port.protocol}`}
                    >
                      {port.hostPort}
                    </span>
                  ),
                )
              : "无公开端口"}
          </div>
          <div className="container-card__buttons">
            {control && (
              <button
                type="button"
                className={`container-control container-control--${control.action}`}
                disabled={pending}
                onClick={() => onControl(container.id, control.action)}
              >
                {pending ? (
                  <SpinnerGap className="is-spinning" size={15} />
                ) : control.action === "pause" ? (
                  <Pause size={15} weight="fill" />
                ) : (
                  <Play size={15} weight="fill" />
                )}
                {pending ? "处理中" : control.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
