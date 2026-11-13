import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import ts from "typescript"

const source = await readFile(
  new URL("../src/api/dockergo.ts", import.meta.url),
  "utf8",
)
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
})
const { listCatalogApps } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
)

async function withPayload(payload, run) {
  const originalWindow = globalThis.window
  const originalFetch = globalThis.fetch
  globalThis.window = { DockerGoConfig: { apiBase: "https://router.test/api" } }
  globalThis.fetch = async (url) => {
    assert.equal(url, "https://router.test/api/apps.json")
    return { ok: true, status: 200, json: async () => payload }
  }
  try {
    await run()
  } finally {
    globalThis.fetch = originalFetch
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  }
}

test("reads root tags without deriving tags from apps, preserving API order", async () => {
  await withPayload(
    { schemaVersion: 1, apps: [], tags: ["Web", "网络"] },
    async () => {
      const catalog = await listCatalogApps()
      assert.deepEqual(catalog.tags, ["Web", "网络"])
      assert.deepEqual(catalog.apps, [])
    },
  )
})

test("accepts empty root tags even when applications have their own tags", async () => {
  const app = {
    id: "nginx",
    title: "Nginx",
    version: "1",
    description: "Web server",
    image: "nginx:latest",
    tags: ["Web"],
  }
  await withPayload({ schemaVersion: 1, apps: [app], tags: [] }, async () => {
    const catalog = await listCatalogApps()
    assert.deepEqual(catalog.tags, [])
    assert.deepEqual(catalog.apps[0].tags, ["Web"])
  })
})

test("rejects missing or invalid root tags instead of falling back to app tags", async () => {
  for (const tags of [undefined, null, "Web", [123], [null], [" "]]) {
    await withPayload({ schemaVersion: 1, apps: [], tags }, async () => {
      await assert.rejects(listCatalogApps(), /无效的标签列表/)
    })
  }
})
