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

export type DockerPortBinding = {
  HostIp: string
  HostPort: string
}

export type DockerNetworkDetails = {
  Gateway?: string
  IPAddress?: string
  MacAddress?: string
}

export type DockerMountDetails = {
  Type: string
  Name?: string
  Source: string
  Destination: string
  Driver?: string
  Mode: string
  RW: boolean
  Propagation?: string
}

export type DockerContainerDetails = {
  id: string
  name: string
  image: string
  imageId: string
  createdAt: string
  platform: string
  driver: string
  restartPolicy: string
  networkMode: string
  command: {
    path: string
    args: string[]
  }
  state: {
    status: string
    running: boolean
    paused: boolean
    restarting: boolean
    oomKilled: boolean
    dead: boolean
    pid: number
    exitCode: number
    error: string
    startedAt: string
    finishedAt: string
    health: string
  }
  ports: Record<string, DockerPortBinding[] | null>
  networks: Record<string, DockerNetworkDetails>
  mounts: DockerMountDetails[]
}

export type DockerContainerInspectResponse = {
  success: boolean
  container?: DockerContainerDetails
  error?: DockerApiError
}

export type DockerContainerLogsResponse = {
  success: boolean
  id?: string
  lines?: string[]
  error?: DockerApiError
}

export type DockerContainerRemoveResponse = {
  success: boolean
  id?: string
  error?: DockerApiError
}

export type InstallPhase = "configure" | "installing" | "complete"

export type InstallConfiguration = {
  hostPort: string
  containerPort: string
  dataDirectory: string
  autoStart: boolean
  autoUpdate: boolean
}
