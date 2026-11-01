type FileUploadElement = HTMLElement & {
  querySelector(selectors: string): HTMLElement | null
}

type LuCIUi = {
  FileUpload: new (
    value: string | null,
    options: Record<string, unknown>,
  ) => {
    render: () => Promise<FileUploadElement>
  }
  showModal: (title: string, children: HTMLElement[]) => void
  hideModal: () => void
}

declare global {
  interface Window {
    L?: {
      require: (name: string) => Promise<LuCIUi>
    }
  }
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  text?: string,
) {
  const element = document.createElement(tagName)
  if (text) element.textContent = text
  return element
}

export async function selectSystemDirectory(currentPath: string) {
  if (!window.L?.require) {
    throw new Error("当前页面未运行在 LuCI 环境中")
  }

  const ui = await window.L.require("ui")
  const selectedPath = currentPath.startsWith("/mnt/") ? currentPath : null
  const picker = new ui.FileUpload(selectedPath, {
    id: "dockergo-directory-picker",
    name: "dockergo-directory-picker",
    browser: false,
    directory_create: false,
    directory_select: true,
    show_hidden: false,
    enable_upload: false,
    enable_remove: false,
    enable_download: false,
    root_directory: "/mnt",
    initial_directory: "/mnt",
  })
  const pickerElement = await picker.render()
  const overlayHost = document.getElementById("dockergo-overlay-root")
  const previousDisplay = overlayHost?.style.display || ""

  return new Promise<string | null>((resolve) => {
    let settled = false

    const finish = (path: string | null) => {
      if (settled) return

      settled = true
      ui.hideModal()
      if (overlayHost) overlayHost.style.display = previousDisplay
      resolve(path)
    }

    pickerElement.addEventListener("cbi-fileupload-select", (event) => {
      const detail = (event as CustomEvent<{ path?: string }>).detail
      finish(detail?.path || null)
    })
    pickerElement.addEventListener("cbi-fileupload-cancel", () => finish(null))

    const description = createElement("p", "请选择 /mnt 下的存储目录。")
    const actions = createElement("div")
    actions.className = "right"
    const cancelButton = createElement("button", "取消")
    cancelButton.type = "button"
    cancelButton.className = "btn"
    cancelButton.addEventListener("click", () => finish(null))
    actions.append(cancelButton)

    if (overlayHost) overlayHost.style.display = "none"
    ui.showModal("选择映射目录", [description, pickerElement, actions])
    const openButton = pickerElement.querySelector(
      ".open-file-browser",
    ) as HTMLElement | null
    openButton?.click()
  })
}
