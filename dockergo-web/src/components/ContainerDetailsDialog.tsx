import {
  Cube,
  FolderOpen,
  HardDrives,
  Network,
  SpinnerGap,
  X,
} from "@phosphor-icons/react"
import { useEffect, useRef, useState } from "react"
import { inspectDockerContainer } from "../api/dockergo"
import type { DockerContainer, DockerContainerDetails } from "../types"

type ContainerDetailsDialogProps = {
  container: DockerContainer
  onClose: () => void
  onError: (message: string) => void
}

function formatDate(value: string) {
  if (!value || value.startsWith("0001-")) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN")
}

function displayName(value: string) {
  return value.replace(/^\//, "") || "未命名容器"
}

export function ContainerDetailsDialog({
  container,
  onClose,
  onError,
}: ContainerDetailsDialogProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [details, setDetails] = useState<DockerContainerDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    titleRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    document.addEventListener("keydown", handleKeyDown)
    void inspectDockerContainer(container.id)
      .then((response) => {
        if (!active) return
        if (!response.success || !response.container || response.error) {
          throw new Error(response.error?.message || "无法读取容器详情")
        }
        setDetails(response.container)
      })
      .catch((inspectError: unknown) => {
        if (!active) return
        onError(
          inspectError instanceof Error
            ? inspectError.message
            : "无法读取容器详情",
        )
        onClose()
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [container.id, onClose, onError])

  const command = details
    ? [details.command.path, ...details.command.args].filter(Boolean).join(" ")
    : ""
  const ports = details ? Object.entries(details.ports) : []
  const networks = details ? Object.entries(details.networks) : []

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="container-details-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="container-details-title"
      >
        <button
          type="button"
          className="modal-close"
          aria-label="关闭容器详情"
          onClick={onClose}
        >
          <X size={19} />
        </button>

        <header className="container-details__header">
          <div className="container-details__icon" aria-hidden="true">
            <Cube size={26} weight="duotone" />
          </div>
          <div>
            <span>容器详情</span>
            <h2 id="container-details-title" ref={titleRef} tabIndex={-1}>
              {displayName(details?.name || container.name)}
            </h2>
            <p>{details?.image || container.image}</p>
          </div>
        </header>

        {loading ? (
          <div className="container-details__message" role="status">
            <SpinnerGap className="is-spinning" size={25} />
            <span>正在读取容器详情</span>
          </div>
        ) : details ? (
          <div className="container-details__content">
            <section className="details-section">
              <div className="details-section__title">
                <HardDrives size={17} />
                <h3>运行信息</h3>
              </div>
              <dl className="details-grid">
                <div>
                  <dt>状态</dt>
                  <dd>{details.state.status || "未知"}</dd>
                </div>
                <div>
                  <dt>健康状态</dt>
                  <dd>{details.state.health || "未配置"}</dd>
                </div>
                <div>
                  <dt>PID</dt>
                  <dd>{details.state.pid || "—"}</dd>
                </div>
                <div>
                  <dt>退出码</dt>
                  <dd>{details.state.exitCode}</dd>
                </div>
                <div>
                  <dt>创建时间</dt>
                  <dd>{formatDate(details.createdAt)}</dd>
                </div>
                <div>
                  <dt>启动时间</dt>
                  <dd>{formatDate(details.state.startedAt)}</dd>
                </div>
                <div>
                  <dt>重启策略</dt>
                  <dd>{details.restartPolicy || "no"}</dd>
                </div>
                <div>
                  <dt>存储驱动</dt>
                  <dd>{details.driver || "—"}</dd>
                </div>
              </dl>
              <div className="details-code">
                <span>容器 ID</span>
                <code>{details.id}</code>
              </div>
              {command && (
                <div className="details-code">
                  <span>启动命令</span>
                  <code>{command}</code>
                </div>
              )}
              {details.state.error && (
                <div className="details-alert">{details.state.error}</div>
              )}
            </section>

            <section className="details-section">
              <div className="details-section__title">
                <Network size={17} />
                <h3>网络与端口</h3>
                <span>{details.networkMode || "default"}</span>
              </div>
              {ports.length > 0 ? (
                <div className="details-list">
                  {ports.map(([containerPort, bindings]) => (
                    <div key={containerPort}>
                      <strong>{containerPort}</strong>
                      <span>
                        {bindings?.length
                          ? bindings
                              .map(
                                (binding) =>
                                  `${binding.HostIp || "0.0.0.0"}:${binding.HostPort}`,
                              )
                              .join("、")
                          : "未发布到宿主机"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="details-empty">未配置端口</p>
              )}
              {networks.length > 0 && (
                <div className="details-list details-list--networks">
                  {networks.map(([name, network]) => (
                    <div key={name}>
                      <strong>{name}</strong>
                      <span>{network.IPAddress || "未分配 IP"}</span>
                      {network.Gateway && <small>网关 {network.Gateway}</small>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="details-section">
              <div className="details-section__title">
                <FolderOpen size={17} />
                <h3>挂载</h3>
                <span>{details.mounts.length}</span>
              </div>
              {details.mounts.length > 0 ? (
                <div className="details-list details-list--mounts">
                  {details.mounts.map((mount) => (
                    <div key={`${mount.Type}:${mount.Destination}`}>
                      <strong>{mount.Destination}</strong>
                      <span>{mount.Source || mount.Name || mount.Type}</span>
                      <small>{mount.RW ? "读写" : "只读"}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="details-empty">未配置挂载</p>
              )}
            </section>
          </div>
        ) : null}
      </section>
    </div>
  )
}
