import { SpinnerGap, Trash, Warning, X } from "@phosphor-icons/react"
import { useEffect, useRef } from "react"
import type { DockerContainer } from "../types"

type RemoveContainerDialogProps = {
  container: DockerContainer
  pending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function RemoveContainerDialog({
  container,
  pending,
  onClose,
  onConfirm,
}: RemoveContainerDialogProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    titleRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose, pending])

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose()
      }}
    >
      <section
        className="remove-container-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remove-container-title"
        aria-describedby="remove-container-description"
      >
        <button
          type="button"
          className="modal-close"
          aria-label="取消卸载"
          disabled={pending}
          onClick={onClose}
        >
          <X size={19} />
        </button>

        <div className="remove-container-dialog__icon" aria-hidden="true">
          <Warning size={26} weight="fill" />
        </div>
        <span className="remove-container-dialog__kicker">危险操作</span>
        <h2 id="remove-container-title" ref={titleRef} tabIndex={-1}>
          卸载 {container.name || container.id.slice(0, 12)}？
        </h2>
        <p id="remove-container-description">
          容器将被强制停止并删除。镜像和数据卷会保留，之后仍可重新创建容器。
        </p>

        <div className="remove-container-dialog__notice">
          <strong>容器 ID</strong>
          <code>{container.id.slice(0, 12)}</code>
        </div>

        <div className="remove-container-dialog__actions">
          <button type="button" disabled={pending} onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="danger-button"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? (
              <SpinnerGap className="is-spinning" size={16} />
            ) : (
              <Trash size={16} weight="bold" />
            )}
            {pending ? "正在卸载" : "确认卸载"}
          </button>
        </div>
      </section>
    </div>
  )
}
