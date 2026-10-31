export type AppColor = "indigo" | "blue" | "red" | "green" | "teal" | "rose"

export type CatalogApp = {
  name: string
  image: string
  description: string
  category: string
  color: AppColor
  mark: string
  downloads: string
  version: string
  verified: boolean
  defaultPort: string
}

export type DockerContainer = {
  id: string
  name: string
  image: string
  command: string
  createdAt: string
  runningFor: string
  ports: string
  state: string
  status: string
  networks: string
  mounts: string
}

export type DockerApiError = {
  code: string
  message: string
}

export type DockerContainerListResponse = {
  containers: DockerContainer[]
  error?: DockerApiError
}

export type DockerContainerAction = "start" | "pause" | "unpause"

export type DockerContainerActionResponse = {
  success: boolean
  id?: string
  action?: DockerContainerAction
  error?: DockerApiError
}

export type StoreView = "market" | "installed"
export type InstallPhase = "configure" | "installing" | "complete"

export type InstallConfiguration = {
  hostPort: string
  containerPort: string
  dataDirectory: string
  autoStart: boolean
  autoUpdate: boolean
}
