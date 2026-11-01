import {
  DownloadSimple,
  FolderOpen,
  SpinnerGap,
  X,
} from "@phosphor-icons/react"
import { useEffect, useRef, useState } from "react"
import type { CatalogApp, InstallConfiguration } from "../types"
import { DirectoryPickerDialog } from "./DirectoryPickerDialog"

type InstallDialogProps = {
  app: CatalogApp
  configuration: InstallConfiguration
  submitting: boolean
  onConfigurationChange: (patch: Partial<InstallConfiguration>) => void
  onError: (message: string) => void
  onInstall: () => void
  onClose: () => void
}

export function InstallDialog({
  app,
  configuration,
  submitting,
  onConfigurationChange,
  onError,
  onInstall,
  onClose,
}: InstallDialogProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [directoryPickerOpen, setDirectoryPickerOpen] = useState(false)
  const port = app.ports.find((candidate) => candidate.web) || app.ports[0]
  const hasVolume = app.volumes.length > 0
  const mark = Array.from(app.title.trim())[0]?.toLocaleUpperCase() || "?"
  const isValid =
    (!port || configuration.hostPort.length > 0) &&
    (!hasVolume || configuration.dataDirectory.length > 0)

  useEffect(() => {
    titleRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting && !directoryPickerOpen) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [directoryPickerOpen, onClose, submitting])

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose()
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
          disabled={submitting}
          onClick={onClose}
        >
          <X size={19} />
        </button>

        <div className="app-logo modal-logo app-logo--blue" aria-hidden="true">
          {mark}
        </div>
        <span className="modal-kicker">安装配置</span>
        <h2 id="install-title" ref={titleRef} tabIndex={-1}>
          {app.title}
        </h2>
        <p>配置端口与持久化目录，确认后将在系统任务窗口中显示安装日志。</p>

        <form
          className="config-form"
          onSubmit={(event) => {
            event.preventDefault()
            onInstall()
          }}
        >
          {port && (
            <fieldset className="form-group">
              <legend>端口映射</legend>
              <div className="port-mapping">
                <label className="port-mapping__field">
                  <span>主机端口</span>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    disabled={submitting}
                    value={configuration.hostPort}
                    onChange={(event) =>
                      onConfigurationChange({ hostPort: event.target.value })
                    }
                  />
                </label>
                <strong aria-hidden="true">-&gt;</strong>
                <div className="port-mapping__field port-mapping__fixed">
                  <span>容器端口</span>
                  <output aria-label={`容器端口 ${port.container}，系统固定`}>
                    <b>{port.container}</b>
                    <small>系统固定</small>
                  </output>
                </div>
                <em>TCP</em>
              </div>
            </fieldset>
          )}

          {hasVolume && (
            <div className="form-group">
              <label htmlFor="data-directory">映射目录</label>
              <div className="directory-input">
                <span aria-hidden="true">/</span>
                <input
                  id="data-directory"
                  disabled={submitting}
                  value={configuration.dataDirectory.replace(/^\//, "")}
                  onChange={(event) =>
                    onConfigurationChange({
                      dataDirectory: `/${event.target.value.replace(/^\/+/, "")}`,
                    })
                  }
                  placeholder="docker/apps/app-name"
                  aria-describedby="data-directory-help"
                />
                <button
                  type="button"
                  className="directory-input__browse"
                  disabled={submitting}
                  aria-label="选择映射目录"
                  title="选择映射目录"
                  onClick={() => setDirectoryPickerOpen(true)}
                >
                  <FolderOpen size={18} weight="duotone" />
                </button>
              </div>
              <small id="data-directory-help">
                可手动输入，或从设备的 /mnt 存储目录中选择
              </small>
            </div>
          )}

          <div className="install-options">
            <label>
              <input
                type="checkbox"
                disabled={submitting}
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
          </div>

          <div className="install-summary">
            <div>
              <span>容器镜像</span>
              <strong>{app.image}</strong>
            </div>
            <div>
              <span>预计耗时</span>
              <strong>约 1 分钟</strong>
            </div>
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <SpinnerGap className="is-spinning" size={17} />
            ) : (
              <DownloadSimple size={17} weight="bold" />
            )}
            {submitting ? "正在创建安装任务" : "确认配置并安装"}
          </button>
        </form>
      </section>

      {directoryPickerOpen && (
        <DirectoryPickerDialog
          initialPath={configuration.dataDirectory}
          onSelect={(path) => {
            onConfigurationChange({ dataDirectory: path })
            setDirectoryPickerOpen(false)
          }}
          onClose={() => setDirectoryPickerOpen(false)}
          onError={onError}
        />
      )}
    </div>
  )
}
