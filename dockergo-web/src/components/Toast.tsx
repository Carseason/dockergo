import { Check, WarningCircle, X } from "@phosphor-icons/react"
import { useCallback, useEffect, useRef, useState } from "react"

export type ToastVariant = "success" | "error"

type ToastProps = {
  variant: ToastVariant
  title: string
  message: string
  onDismiss: () => void
}

export function Toast({ variant, title, message, onDismiss }: ToastProps) {
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<number | null>(null)

  const dismiss = useCallback(() => {
    if (closing) return

    setClosing(true)
    closeTimer.current = window.setTimeout(onDismiss, 150)
  }, [closing, onDismiss])

  useEffect(() => {
    if (closing) return

    const autoDismissTimer = window.setTimeout(dismiss, 4850)
    return () => window.clearTimeout(autoDismissTimer)
  }, [closing, dismiss])

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
    },
    [],
  )

  return (
    <div
      className={`toast toast--${variant} ${closing ? "toast--closing" : ""}`}
      role={variant === "error" ? "alert" : "status"}
    >
      <span className="toast__icon" aria-hidden="true">
        {variant === "error" ? (
          <WarningCircle size={17} weight="fill" />
        ) : (
          <Check size={15} weight="bold" />
        )}
      </span>
      <div className="toast__content">
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      <button
        type="button"
        className="toast__close"
        aria-label="关闭通知"
        onClick={dismiss}
      >
        <X size={15} />
      </button>
    </div>
  )
}
