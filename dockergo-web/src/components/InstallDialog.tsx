import { Check, DownloadSimple, X } from "@phosphor-icons/react"
import { useEffect, useRef } from "react"
import type { CatalogApp, InstallConfiguration, InstallPhase } from "../types"

type InstallDialogProps = {
  app: CatalogApp
  phase: InstallPhase
  configuration: InstallConfiguration
  logs: string[]
  onConfigurationChange: (patch: Partial<InstallConfiguration>) => void
  onInstall: () => void
  onClose: () => void
  onShowInstalled: () => void
}

export function InstallDialog({
  app,
  phase,
  configuration,
  logs,
  onConfigurationChange,
  onInstall,
  onClose,
  onShowInstalled,
}: InstallDialogProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const progress = phase === "complete" ? 100 : Math.min(92, logs.length * 12)
  const isValid =
    configuration.hostPort.length > 0 &&
    configuration.containerPort.length > 0 &&
    configuration.dataDirectory.length > 0

  useEffect(() => {
    titleRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && phase !== "installing") onClose()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose, phase])

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="install-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
      >
        <button
          type="button"
          className="modal-close"
          aria-label="关闭"
          disabled={phase === "installing"}
          onClick={onClose}
        >
          <X size={19} />
        </button>

        <div
          className={`app-logo modal-logo app-logo--${app.color}`}
          aria-hidden="true"
        >
          {app.mark}
        </div>
        <span className="modal-kicker">
          {phase === "configure"
            ? "安装配置"
            : phase === "installing"
              ? "正在安装"
              : "安装完成"}
        </span>
        <h2 id="install-title" ref={titleRef} tabIndex={-1}>
          {app.name}
        </h2>
        <p>
          {phase === "configure"
            ? "配置端口与持久化目录，确认后将自动创建并启动容器。"
            : phase === "installing"
              ? "请保持窗口开启，正在执行容器部署任务。"
              : `服务已运行，可通过主机端口 ${configuration.hostPort} 访问。`}
        </p>

        {phase === "configure" ? (
          <form
            className="config-form"
            onSubmit={(event) => {
              event.preventDefault()
              onInstall()
            }}
          >
            <fieldset className="form-group">
              <legend>端口映射</legend>
              <div className="port-mapping">
                <label>
                  <span>主机端口</span>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    value={configuration.hostPort}
                    onChange={(event) =>
                      onConfigurationChange({ hostPort: event.target.value })
                    }
                  />
                </label>
                <strong aria-hidden="true">-&gt;</strong>
                <label>
                  <span>容器端口</span>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    value={configuration.containerPort}
                    onChange={(event) =>
                      onConfigurationChange({
                        containerPort: event.target.value,
                      })
                    }
                  />
                </label>
                <em>TCP</em>
              </div>
            </fieldset>

            <div className="form-group">
              <label htmlFor="data-directory">映射目录</label>
              <div className="directory-input">
                <span aria-hidden="true">/</span>
                <input
                  id="data-directory"
                  value={configuration.dataDirectory.replace(/^\//, "")}
                  onChange={(event) =>
                    onConfigurationChange({
                      dataDirectory: `/${event.target.value.replace(/^\/+/, "")}`,
                    })
                  }
                  placeholder="docker/apps/app-name"
                  aria-describedby="data-directory-help"
                />
              </div>
              <small id="data-directory-help">
                应用配置和数据将持久化保存在此目录
              </small>
            </div>

            <div className="install-options">
              <label>
                <input
                  type="checkbox"
                  checked={configuration.autoStart}
                  onChange={(event) =>
                    onConfigurationChange({ autoStart: event.target.checked })
                  }
                />
                <span>
                  <strong>自动启动</strong>
                  <small>Docker 启动时自动运行应用</small>
                </span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={configuration.autoUpdate}
                  onChange={(event) =>
                    onConfigurationChange({ autoUpdate: event.target.checked })
                  }
                />
                <span>
                  <strong>自动更新</strong>
                  <small>有稳定版本时自动升级</small>
                </span>
              </label>
            </div>

            <div className="install-summary">
              <div>
                <span>镜像版本</span>
                <strong>{app.version}</strong>
              </div>
              <div>
                <span>预计耗时</span>
                <strong>约 1 分钟</strong>
              </div>
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={!isValid}
            >
              <DownloadSimple size={17} weight="bold" />
              确认配置并安装
            </button>
          </form>
        ) : (
          <div className="install-progress">
            <div className="progress-header">
              <span>安装进度</span>
              <strong>{progress}%</strong>
            </div>
            <progress className="progress-track" max="100" value={progress}>
              {progress}%
            </progress>
            <div className="install-log" aria-live="polite">
              <div className="log-title">
                <strong>安装日志</strong>
              </div>
              <div className="log-lines">
                {logs.map((line, index) => (
                  <p
                    key={`${line}-${index}`}
                    className={line.startsWith("[完成]") ? "success" : ""}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {line}
                  </p>
                ))}
                {phase === "installing" && <i className="log-cursor">_</i>}
              </div>
            </div>
            {phase === "complete" && (
              <button
                type="button"
                className="primary-button"
                onClick={onShowInstalled}
              >
                <Check size={17} weight="bold" />
                查看已安装应用
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
