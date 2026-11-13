import { readFile, mkdir, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"
import { parse } from "yaml"

export function convertApps(source) {
  const catalog = parse(source)
  if (!catalog || catalog.schemaVersion !== 1 || !Array.isArray(catalog.apps)) {
    throw new Error("应用目录必须包含 schemaVersion: 1 和 apps 数组")
  }

  const ids = new Set()
  const tags = new Set()
  for (const app of catalog.apps) {
    if (
      !app ||
      typeof app.id !== "string" ||
      !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(app.id) ||
      ids.has(app.id)
    ) {
      throw new Error("应用 ID 无效或重复")
    }
    ids.add(app.id)
    if (
      typeof app.version !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(app.version)
    ) {
      throw new Error(
        `应用 ${app.id} 的 version 必须是有效字符串，请给数字版本加引号`,
      )
    }
    if (
      !Array.isArray(app.tags) ||
      app.tags.some(
        (tag) => typeof tag !== "string" || !tag.trim() || tag !== tag.trim(),
      )
    ) {
      throw new Error(
        `应用 ${app.id} 的 tags 必须是非空、无首尾空白的字符串数组`,
      )
    }
    for (const tag of app.tags) tags.add(tag)
  }

  const appsJson =
    JSON.stringify({ ...catalog, tags: [...tags] }, null, 2) + "\n"
  if (Buffer.byteLength(appsJson) > 1024 * 1024) {
    throw new Error("生成的应用目录超过 1 MiB")
  }
  return { appsJson }
}

export async function generateApps(
  projectRoot = fileURLToPath(new URL("../../", import.meta.url)),
) {
  // Parse and validate before changing any generated files.
  const { appsJson } = convertApps(
    await readFile(resolve(projectRoot, "datas/apps.yaml"), "utf8"),
  )
  for (const directory of [
    "datas",
    "luci-app-dockergo/root/usr/share/dockergo",
  ]) {
    const destination = resolve(projectRoot, directory)
    await mkdir(destination, { recursive: true })
    await writeFile(resolve(destination, "apps.json"), appsJson)
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (process.argv.length !== 2)
      throw new Error("用法：node scripts/generate-apps.mjs")
    await generateApps()
    console.log("已生成包含顶层 tags 的 apps.json，并同步到 LuCI 插件数据目录")
  } catch (error) {
    console.error(`生成应用数据失败：${error.message}`)
    process.exitCode = 1
  }
}
