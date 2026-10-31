import { StrictMode } from "react"
import { createRoot, type Root } from "react-dom/client"
import App from "./App"
import "./styles.css"

declare global {
  interface Window {
    DockerGoMount?: (element: HTMLElement) => void
    DockerGoUnmount?: (element: HTMLElement) => void
  }
}

const roots = new WeakMap<HTMLElement, Root>()

function mountDockerGo(element: HTMLElement) {
  if (roots.has(element)) return

  const root = createRoot(element)
  roots.set(element, root)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

function unmountDockerGo(element: HTMLElement) {
  roots.get(element)?.unmount()
  roots.delete(element)
}

window.DockerGoMount = mountDockerGo
window.DockerGoUnmount = unmountDockerGo

const standaloneRoot = document.getElementById("dockergo-standalone-root")
if (standaloneRoot) mountDockerGo(standaloneRoot)
