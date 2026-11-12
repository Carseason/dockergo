import type { CatalogApp, InstallConfiguration } from "./types"

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:=@%+,-]+$/.test(value)) return value
  return `'${value.replace(/'/g, "'\\''")}'`
}

export function getDockerRunPreview(
  app: CatalogApp,
  configuration: InstallConfiguration,
): string {
  const instanceId = "<实例ID>"
  const args = [
    "/usr/bin/docker",
    "container",
    "run",
    "--name",
    `dgo_${app.id}_${app.version}_${instanceId}`,
  ]

  if (app.rm) args.push("--rm")
  else args.push("--restart", configuration.restart)
  if (app.d) args.push("--detach")

  app.ports.forEach((port, index) => {
    const hostPort = configuration.ports[index] || "<宿主机端口>"
    args.push("--publish", `0.0.0.0:${hostPort}:${port.target}/tcp`)
  })
  app.volumes.forEach((volume, index) => {
    const source = configuration.volumes[index] || ""
    if (source !== "") args.push("--volume", `${source}:${volume.target}`)
  })
  for (const [key, value] of Object.entries(app.environment)) {
    args.push("--env", `${key}=${value}`)
  }
  args.push(app.image)
  for (const argument of app.command) {
    const input = argument.match(/^\{\{([a-z][a-z0-9_-]*)\}\}$/)
    args.push(input ? configuration.inputs[input[1]] || "" : argument)
  }
  return args.map(shellQuote).join(" ")
}
