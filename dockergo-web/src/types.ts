export type CatalogPort = {
  port: number
  target: number
  desc: string
}

export type CatalogVolume = {
  target: string
  type: "dir" | "file"
  desc: string
  required: boolean
}

export type CatalogInput = {
  id: string
  title: string
  required: boolean
  placeholder: string
}

export type RestartPolicy = "no" | "always" | "unless-stopped" | "on-failure"

export type CatalogApp = {
  id: string
  title: string
  version: string
  description: string
  tags: string[]
  image: string
  d: boolean
  rm: boolean
  restart: RestartPolicy
  ports: CatalogPort[]
  volumes: CatalogVolume[]
  inputs: CatalogInput[]
  environment: Record<string, string>
  command: string[]
}

export type CatalogResponse = {
  schemaVersion: number
  apps: CatalogApp[]
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
  managed: boolean
  appId: string
  appVersion: string
  instanceId: string
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

export type InstallConfiguration = {
  ports: string[]
  volumes: string[]
  inputs: Record<string, string>
  restart: RestartPolicy
}

export type DockerInstallResponse = {
  success: boolean
  taskId: string
  containerName: string
  error?: DockerApiError
}

export type DockerFileEntry = {
  name: string
  path: string
  type: "directory" | "file"
}

export type DockerFileListResponse = {
  success: boolean
  path: string
  parent?: string
  entries: DockerFileEntry[]
  error?: DockerApiError
}
