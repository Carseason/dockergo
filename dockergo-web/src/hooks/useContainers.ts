import { useCallback, useEffect, useRef, useState } from "react"
import { controlDockerContainer, listDockerContainers } from "../api/dockergo"
import type { DockerContainer, DockerContainerAction } from "../types"

type ContainerOperation = "list" | "control"

export function useContainers(
  onError: (message: string, operation: ContainerOperation) => void,
) {
  const [containers, setContainers] = useState<DockerContainer[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingContainerId, setPendingContainerId] = useState("")
  const requestId = useRef(0)

  const refresh = useCallback(
    async (silent = false) => {
      const currentRequest = ++requestId.current
      if (!silent) setLoading(true)

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
        onError(
          requestError instanceof Error
            ? requestError.message
            : "无法获取 Docker 容器列表",
          "list",
        )
      } finally {
        if (!silent && currentRequest === requestId.current) setLoading(false)
      }
    },
    [onError],
  )

  const control = useCallback(
    async (containerId: string, action: DockerContainerAction) => {
      setPendingContainerId(containerId)

      try {
        const response = await controlDockerContainer(containerId, action)
        if (!response.success || response.error) {
          throw new Error(response.error?.message || "容器操作失败")
        }

        await refresh(true)
      } catch (controlError) {
        onError(
          controlError instanceof Error ? controlError.message : "容器操作失败",
          "control",
        )
      } finally {
        setPendingContainerId("")
      }
    },
    [onError, refresh],
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
    pendingContainerId,
    refresh,
    control,
  }
}
