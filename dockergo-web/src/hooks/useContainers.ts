import { useCallback, useEffect, useRef, useState } from "react"
import { controlDockerContainer, listDockerContainers } from "../api/dockergo"
import type { DockerContainer, DockerContainerAction } from "../types"

export function useContainers() {
  const [containers, setContainers] = useState<DockerContainer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [pendingContainerId, setPendingContainerId] = useState("")
  const [actionError, setActionError] = useState({ id: "", message: "" })
  const requestId = useRef(0)

  const refresh = useCallback(async (silent = false) => {
    const currentRequest = ++requestId.current
    if (!silent) setLoading(true)
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
      if (!silent && currentRequest === requestId.current) setLoading(false)
    }
  }, [])

  const control = useCallback(
    async (containerId: string, action: DockerContainerAction) => {
      setPendingContainerId(containerId)
      setActionError({ id: "", message: "" })

      try {
        const response = await controlDockerContainer(containerId, action)
        if (!response.success || response.error) {
          throw new Error(response.error?.message || "容器操作失败")
        }

        await refresh(true)
      } catch (controlError) {
        setActionError({
          id: containerId,
          message:
            controlError instanceof Error
              ? controlError.message
              : "容器操作失败",
        })
      } finally {
        setPendingContainerId("")
      }
    },
    [refresh],
  )

  useEffect(() => {
    void refresh()
    return () => {
      requestId.current += 1
    }
  }, [refresh])

  return {
    containers,
    loading,
    error,
    pendingContainerId,
    actionError,
    refresh,
    control,
  }
}
