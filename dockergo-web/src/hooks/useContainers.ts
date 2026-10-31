import { useCallback, useEffect, useRef, useState } from "react"
import { listDockerContainers } from "../api/dockergo"
import type { DockerContainer } from "../types"

export function useContainers() {
  const [containers, setContainers] = useState<DockerContainer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const requestId = useRef(0)

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current
    setLoading(true)
    setError("")

    try {
      const response = await listDockerContainers()
      if (currentRequest !== requestId.current) return

      if (response.error) {
        throw new Error(response.error.message)
      }

      setContainers(response.containers || [])
    } catch (requestError) {
      if (currentRequest !== requestId.current) return
      setContainers([])
      setError(
        requestError instanceof Error
          ? requestError.message
          : "无法获取 Docker 容器列表",
      )
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    return () => {
      requestId.current += 1
    }
  }, [refresh])

  return { containers, loading, error, refresh }
}
