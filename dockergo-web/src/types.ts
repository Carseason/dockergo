export type AppColor = "indigo" | "blue" | "red" | "green" | "teal" | "rose"

export type CatalogApp = {
  name: string
  description: string
  category: string
  color: AppColor
  mark: string
  downloads: string
  version: string
  verified: boolean
  defaultPort: string
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
