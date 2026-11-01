declare global {
  interface Window {
    DockerGoSelectDirectory?: (currentPath: string) => Promise<string | null>
  }
}

export async function selectSystemDirectory(currentPath: string) {
  if (!window.DockerGoSelectDirectory) {
    throw new Error("系统目录选择器尚未加载")
  }

  return window.DockerGoSelectDirectory(currentPath)
}
