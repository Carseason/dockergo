import { ArrowClockwise, FileText, SpinnerGap, X } from "@phosphor-icons/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { getDockerContainerLogs } from "../api/dockergo"
import type { DockerContainer } from "../types"

type ContainerLogsDialogProps = {
  container: DockerContainer
  onClose: () => void
  onError: (message: string) => void
}

export function ContainerLogsDialog({
  container,
  onClose,
  onError,
}: ContainerLogsDialogProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const requestId = useRef(0)
  const [lines, setLines] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const loadLogs = useCallback(async () => {
    const currentRequest = ++requestId.current
    setLoading(true)

    try {
      const response = await getDockerContainerLogs(container.id)
      if (currentRequest !== requestId.current) return
      if (!response.success || response.error) {
        throw new Error(response.error?.message || "无法读取容器日志")
      }
      setLines(Array.isArray(response.lines) ? response.lines : [])
    } catch (logsError) {
      if (currentRequest !== requestId.current) return
      onError(
        logsError instanceof Error ? logsError.message : "无法读取容器日志",
      )
      onClose()
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [container.id, onClose, onError])

  useEffect(() => {
    titleRef.current?.focus()
    void loadLogs()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      requestId.current += 1
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [loadLogs, onClose])

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="container-logs-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="container-logs-title"
      >
        <button
          type="button"
          className="modal-close"
          aria-label="关闭容器日志"
          onClick={onClose}
        >
          <X size={19} />
        </button>

        <header className="container-logs__header">
          <div className="container-logs__icon" aria-hidden="true">
            <FileText size={24} weight="duotone" />
          </div>
          <div>
            <span>最近 300 行</span>
            <h2 id="container-logs-title" ref={titleRef} tabIndex={-1}>
              {container.name || container.id.slice(0, 12)} 日志
            </h2>
          </div>
          <button
            type="button"
            className="logs-refresh-button"
            disabled={loading}
            onClick={() => void loadLogs()}
          >
            <ArrowClockwise
              size={15}
              className={loading ? "is-spinning" : ""}
            />
            刷新
          </button>
        </header>

        <div className="container-logs" role="log" aria-live="polite">
          {loading ? (
            <div className="container-logs__message" role="status">
              <SpinnerGap className="is-spinning" size={24} />
              <span>正在读取容器日志</span>
            </div>
          ) : lines.length > 0 ? (
            lines.map((line, index) => (
              <div key={`${index}-${line}`}>
                <span>{String(index + 1).padStart(3, "0")}</span>
                <code>{line}</code>
              </div>
            ))
          ) : (
            <div className="container-logs__message">
              <FileText size={24} />
              <span>该容器暂时没有日志</span>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
