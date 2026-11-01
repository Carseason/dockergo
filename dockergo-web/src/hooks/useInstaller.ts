import { useCallback, useState } from "react"
import { installCatalogApp } from "../api/dockergo"
import type { CatalogApp, InstallConfiguration } from "../types"

function getDefaultConfiguration(app: CatalogApp): InstallConfiguration {
  return {
    ports: app.ports.map((port) => String(port.port)),
    volumes: app.volumes.map(() => ""),
    startNow: true,
    autoStart: app.autoStart ?? false,
  }
}

export function useInstaller() {
  const [selectedApp, setSelectedApp] = useState<CatalogApp | null>(null)
  const [configuration, setConfiguration] =
    useState<InstallConfiguration | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const openInstaller = useCallback((app: CatalogApp) => {
    setSelectedApp(app)
    setConfiguration(getDefaultConfiguration(app))
  }, [])

  const closeInstaller = useCallback(() => {
    if (!submitting) setSelectedApp(null)
  }, [submitting])

  const updateConfiguration = useCallback(
    (patch: Partial<InstallConfiguration>) => {
      setConfiguration((current) =>
        current ? { ...current, ...patch } : current,
      )
    },
    [],
  )

  const startInstallation = useCallback(async () => {
    if (!selectedApp || !configuration || submitting) return null

    setSubmitting(true)
    try {
      const response = await installCatalogApp(selectedApp.id, configuration)
      const result = {
        taskId: response.taskId,
        appTitle: selectedApp.title,
        containerName: response.containerName,
      }
      setSelectedApp(null)
      return result
    } finally {
      setSubmitting(false)
    }
  }, [configuration, selectedApp, submitting])

  return {
    selectedApp,
    configuration,
    submitting,
    openInstaller,
    closeInstaller,
    updateConfiguration,
    startInstallation,
  }
}
