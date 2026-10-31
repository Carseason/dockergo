import { useCallback, useEffect, useRef, useState } from "react"
import { listCatalogApps } from "../api/dockergo"
import type { CatalogApp } from "../types"

export function useCatalog(onError: (message: string) => void) {
  const [apps, setApps] = useState<CatalogApp[]>([])
  const [loading, setLoading] = useState(true)
  const requestId = useRef(0)

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current
    setLoading(true)

    try {
      const response = await listCatalogApps()
      if (currentRequest !== requestId.current) return
      setApps(response.apps)
    } catch (requestError) {
      if (currentRequest !== requestId.current) return
      setApps([])
      onError(
        requestError instanceof Error
          ? requestError.message
          : "无法获取应用目录",
      )
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [onError])

  useEffect(() => {
    void refresh()
    return () => {
      requestId.current += 1
    }
  }, [refresh])

  return { apps, loading, refresh }
}
