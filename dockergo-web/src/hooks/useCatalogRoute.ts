import { useCallback, useEffect, useSyncExternalStore } from "react"
import {
  formatCatalogRoute,
  parseCatalogRoute,
  type CatalogRoute,
} from "../catalogRoute"

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange)
  window.addEventListener("dockergo:navigate", onChange)
  return () => {
    window.removeEventListener("popstate", onChange)
    window.removeEventListener("dockergo:navigate", onChange)
  }
}

function getSnapshot() {
  return window.location.pathname
}

function getBasePath() {
  const config = window.DockerGoConfig
  if (config?.pageBase)
    return new URL(config.pageBase, window.location.href).pathname
  if (config?.apiBase)
    return new URL(config.apiBase, window.location.href).pathname.replace(
      /\/api\/?$/,
      "",
    )
  return ""
}

export function useCatalogRoute() {
  const pathname = useSyncExternalStore(subscribe, getSnapshot)
  useEffect(() => {
    if (window.location.pathname !== pathname) return
    const basePath = getBasePath()
    const route = parseCatalogRoute(pathname, basePath)
    const canonical = formatCatalogRoute(route, basePath)
    if (route.view === "market" && pathname !== canonical) {
      const url = new URL(window.location.href)
      url.pathname = canonical
      url.hash = ""
      window.history.replaceState(window.history.state, "", url)
      window.dispatchEvent(new Event("dockergo:navigate"))
    }
  }, [pathname])
  const navigate = useCallback((route: CatalogRoute) => {
    const nextPath = formatCatalogRoute(route, getBasePath())
    if (window.location.pathname !== nextPath) {
      const url = new URL(window.location.href)
      url.pathname = nextPath
      url.hash = ""
      window.history.pushState(window.history.state, "", url)
      window.dispatchEvent(new Event("dockergo:navigate"))
    }
  }, [])
  return { route: parseCatalogRoute(pathname, getBasePath()), navigate }
}
