import { useCallback, useSyncExternalStore } from "react"
import {
  formatCatalogRoute,
  parseCatalogRoute,
  type CatalogRoute,
} from "../catalogRoute"

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}

function getSnapshot() {
  return window.location.hash
}

export function useCatalogRoute() {
  const hash = useSyncExternalStore(subscribe, getSnapshot)
  const navigate = useCallback((route: CatalogRoute) => {
    const nextHash = formatCatalogRoute(route)
    if (window.location.hash !== nextHash) window.location.hash = nextHash
  }, [])
  return { route: parseCatalogRoute(hash), navigate }
}
