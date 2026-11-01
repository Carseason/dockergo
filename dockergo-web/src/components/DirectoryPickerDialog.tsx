import {
  ArrowLeft,
  ArrowsClockwise,
  CaretRight,
  Check,
  FileText,
  Folder,
  FolderOpen,
  SpinnerGap,
  X,
} from "@phosphor-icons/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { listDockerFiles } from "../api/dockergo"
import type { DockerFileEntry } from "../types"

type DirectoryPickerDialogProps = {
  initialPath: string
  selectionType: "directory" | "file"
  onSelect: (path: string) => void
  onClose: () => void
  onError: (message: string) => void
}

export function DirectoryPickerDialog({
  initialPath,
  selectionType,
  onSelect,
  onClose,
  onError,
}: DirectoryPickerDialogProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const requestIdRef = useRef(0)
  const [path, setPath] = useState("/mnt")
  const [parent, setParent] = useState<string>()
  const [entries, setEntries] = useState<DockerFileEntry[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(
    selectionType === "file" && initialPath.startsWith("/mnt/")
      ? initialPath
      : null,
  )
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    async (nextPath: string) => {
      const requestId = ++requestIdRef.current
      setLoading(true)

      try {
        const response = await listDockerFiles(nextPath)
        if (requestId !== requestIdRef.current) return

        setPath(response.path)
        setParent(response.parent)
        setEntries(response.entries || [])
        setSelectedFile((current) =>
          current &&
          response.entries.some(
            (entry) => entry.type === "file" && entry.path === current,
          )
            ? current
            : null,
        )
      } catch (error) {
        if (requestId !== requestIdRef.current) return
        onError(error instanceof Error ? error.message : "无法读取目录")
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    },
    [onError],
  )

  useEffect(() => {
    titleRef.current?.focus()
    const initialDirectory =
      selectionType === "file" && initialPath.startsWith("/mnt/")
        ? initialPath.replace(/\/[^/]+$/, "") || "/mnt"
        : initialPath.startsWith("/mnt/")
          ? initialPath
          : "/mnt"
    void load(initialDirectory)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      requestIdRef.current += 1
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [initialPath, load, onClose, selectionType])

  const breadcrumbs = useMemo(() => {
    const segments = path.split("/").filter(Boolean)
    return segments.map((segment, index) => ({
      label: index === 0 ? "存储目录" : segment,
      path: `/${segments.slice(0, index + 1).join("/")}`,
    }))
  }, [path])

  const canSelectDirectory = path.split("/").filter(Boolean).length >= 3
  const selectedPath = selectionType === "file" ? selectedFile : path
  const canSelect =
    selectionType === "file" ? Boolean(selectedFile) : canSelectDirectory

  return (
    <div
      className="directory-picker-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="directory-picker-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="directory-picker-title"
      >
        <header className="directory-picker__header">
          <span className="directory-picker__icon" aria-hidden="true">
            <FolderOpen size={23} weight="duotone" />
          </span>
          <div>
            <span>设备存储</span>
            <h2 id="directory-picker-title" ref={titleRef} tabIndex={-1}>
              选择映射{selectionType === "file" ? "文件" : "目录"}
            </h2>
          </div>
          <button
            type="button"
            className="modal-close"
            aria-label="关闭目录选择器"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>

        <nav className="directory-picker__breadcrumbs" aria-label="当前目录">
          {breadcrumbs.map((item, index) => (
            <span key={item.path}>
              {index > 0 && <CaretRight size={13} aria-hidden="true" />}
              <button
                type="button"
                disabled={loading || item.path === path}
                onClick={() => void load(item.path)}
              >
                {item.label}
              </button>
            </span>
          ))}
        </nav>

        <div className="directory-picker__toolbar">
          <button
            type="button"
            disabled={!parent || loading}
            onClick={() => parent && void load(parent)}
          >
            <ArrowLeft size={16} />
            返回上级
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void load(path)}
          >
            <ArrowsClockwise
              size={16}
              className={loading ? "is-spinning" : ""}
            />
            刷新
          </button>
        </div>

        <div
          className="directory-picker__list"
          aria-busy={loading}
          aria-label={selectionType === "file" ? "文件列表" : "目录列表"}
        >
          {loading ? (
            <div className="directory-picker__status" role="status">
              <SpinnerGap className="is-spinning" size={24} />
              <span>正在读取目录</span>
            </div>
          ) : entries.length > 0 ? (
            entries.map((entry) => (
              <button
                type="button"
                className={`directory-picker__item ${
                  selectedFile === entry.path
                    ? "directory-picker__item--selected"
                    : ""
                }`}
                key={entry.path}
                disabled={
                  entry.type === "file" && selectionType === "directory"
                }
                aria-pressed={
                  entry.type === "file" && selectionType === "file"
                    ? selectedFile === entry.path
                    : undefined
                }
                onClick={() => {
                  if (entry.type === "directory") void load(entry.path)
                  else setSelectedFile(entry.path)
                }}
              >
                {entry.type === "directory" ? (
                  <Folder size={21} weight="duotone" />
                ) : (
                  <FileText size={21} weight="duotone" />
                )}
                <span>{entry.name}</span>
                {entry.type === "directory" ? (
                  <CaretRight size={15} />
                ) : selectedFile === entry.path ? (
                  <Check size={15} weight="bold" />
                ) : (
                  <span />
                )}
              </button>
            ))
          ) : (
            <div className="directory-picker__status">
              <FolderOpen size={25} />
              <span>当前目录中没有可用的文件或目录</span>
            </div>
          )}
        </div>

        <footer className="directory-picker__footer">
          <code title={selectedPath || path}>{selectedPath || path}</code>
          <div>
            <button type="button" onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={!canSelect || loading}
              onClick={() => selectedPath && onSelect(selectedPath)}
            >
              <Check size={16} weight="bold" />
              {selectionType === "file" ? "选择文件" : "选择当前目录"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}
