import {
  DownloadSimple,
  FolderOpen,
  Play,
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
  const [volumePickerIndex, setVolumePickerIndex] = useState<number | null>(
    null,
  )
  const mark = Array.from(app.title.trim())[0]?.toLocaleUpperCase() || "?"
  const isTask = app.mode === "task"
  const isValid =
    configuration.ports.length === app.ports.length &&
    configuration.ports.every((port) => port.length > 0) &&
    configuration.volumes.length === app.volumes.length &&
    app.volumes.every(
      (volume, index) =>
        !volume.required || Boolean(configuration.volumes[index]?.trim()),
    ) &&
    app.inputs.every(
      (input) =>
        !input.required || Boolean(configuration.inputs[input.id]?.trim()),
    )

  const updateHostPort = (index: number, value: string) => {
    onConfigurationChange({
      ports: configuration.ports.map((port, portIndex) =>
        portIndex === index ? value : port,
      ),
    })
  }

  const updateVolumePath = (index: number, value: string) => {
    onConfigurationChange({
      volumes: configuration.volumes.map((path, pathIndex) =>
        pathIndex === index ? value : path,
      ),
    })
  }

  const updateInput = (id: string, value: string) => {
    onConfigurationChange({
      inputs: { ...configuration.inputs, [id]: value },
    })
  }

  useEffect(() => {
    titleRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting && volumePickerIndex === null) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose, submitting, volumePickerIndex])

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
        <span className="modal-kicker">{isTask ? "任务配置" : "安装配置"}</span>
        <h2 id="install-title" ref={titleRef} tabIndex={-1}>
          {app.title}
        </h2>
        <p>
          {isTask
            ? "填写运行参数与存储目录，任务输出将在系统任务窗口中实时显示。"
            : "配置端口与持久化目录，确认后将在系统任务窗口中显示安装日志。"}
        </p>

        <form
          className="config-form"
          onSubmit={(event) => {
            event.preventDefault()
            onInstall()
          }}
        >
          {app.inputs.map((input) => {
            const inputId = `task-input-${input.id}`
            return (
              <div className="form-group" key={input.id}>
                <label htmlFor={inputId}>
                  {input.title}（{input.required ? "必填" : "可选"}）
                </label>
                <input
                  id={inputId}
                  className="task-input"
                  disabled={submitting}
                  required={input.required}
                  maxLength={2048}
                  value={configuration.inputs[input.id] || ""}
                  placeholder={input.placeholder}
                  onChange={(event) =>
                    updateInput(input.id, event.target.value)
                  }
                />
              </div>
            )
          })}

          {app.ports.length > 0 && (
            <fieldset className="form-group">
              <legend>端口映射</legend>
              <div className="port-mappings">
                {app.ports.map((port, index) => (
                  <div className="port-mapping" key={`${port.target}-${index}`}>
                    <label className="port-mapping__field">
                      <span>{port.desc}</span>
                      <input
                        type="number"
                        min="1"
                        max="65535"
                        disabled={submitting}
                        value={configuration.ports[index] || ""}
                        onChange={(event) =>
                          updateHostPort(index, event.target.value)
                        }
                      />
                    </label>
                    <strong aria-hidden="true">-&gt;</strong>
                    <div className="port-mapping__field port-mapping__fixed">
                      <span>容器端口</span>
                      <output aria-label={`容器端口 ${port.target}，系统固定`}>
                        <b>{port.target}</b>
                        <small>系统固定</small>
                      </output>
                    </div>
                    <em>TCP</em>
                  </div>
                ))}
              </div>
            </fieldset>
          )}

          {app.volumes.map((volume, index) => {
            const inputId = `volume-path-${index}`
            const helpId = `${inputId}-help`
            const typeLabel = volume.type === "file" ? "文件" : "目录"

            return (
              <div className="form-group" key={`${volume.target}-${index}`}>
                <label htmlFor={inputId}>
                  {volume.desc}（{typeLabel}，
                  {volume.required ? "必填" : "可选"}）
                </label>
                <div className="directory-input">
                  <input
                    id={inputId}
                    disabled={submitting}
                    required={volume.required}
                    value={configuration.volumes[index] || ""}
                    onChange={(event) =>
                      updateVolumePath(index, event.target.value)
                    }
                    placeholder={`请选择或输入映射${typeLabel}`}
                    aria-describedby={helpId}
                  />
                  <button
                    type="button"
                    className="directory-input__browse"
                    disabled={submitting}
                    aria-label={`选择映射${typeLabel}`}
                    title={`选择映射${typeLabel}`}
                    onClick={() => setVolumePickerIndex(index)}
                  >
                    <FolderOpen size={18} weight="duotone" />
                  </button>
                </div>
                <small id={helpId}>
                  {volume.required ? "必须选择" : "留空则不启用"}
                  ；容器内固定映射到 {volume.target}
                </small>
              </div>
            )
          })}

          {!isTask && (
            <div className="install-options">
              <label>
                <input
                  type="checkbox"
                  disabled={submitting}
                  checked={configuration.startNow}
                  onChange={(event) =>
                    onConfigurationChange({ startNow: event.target.checked })
                  }
                />
                <span>
                  <strong>立即启动</strong>
                  <small>安装完成后立即启动容器</small>
                </span>
              </label>

              {app.autoStart !== undefined && (
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
              )}
            </div>
          )}

          <div className="install-summary">
            <div>
              <span>容器镜像</span>
              <strong>{app.image}</strong>
            </div>
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <SpinnerGap className="is-spinning" size={17} />
            ) : isTask ? (
              <Play size={17} weight="fill" />
            ) : (
              <DownloadSimple size={17} weight="bold" />
            )}
            {submitting
              ? isTask
                ? "正在创建运行任务"
                : "正在创建安装任务"
              : isTask
                ? "确认配置并运行"
                : "确认配置并安装"}
          </button>
        </form>
      </section>

      {volumePickerIndex !== null && app.volumes[volumePickerIndex] && (
        <DirectoryPickerDialog
          initialPath={configuration.volumes[volumePickerIndex] || ""}
          selectionType={
            app.volumes[volumePickerIndex].type === "file"
              ? "file"
              : "directory"
          }
          onSelect={(path) => {
            updateVolumePath(volumePickerIndex, path)
            setVolumePickerIndex(null)
          }}
          onClose={() => setVolumePickerIndex(null)}
          onError={onError}
        />
      )}
    </div>
  )
}
