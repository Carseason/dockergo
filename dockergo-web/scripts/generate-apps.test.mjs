import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { convertApps, generateApps } from "./generate-apps.mjs"

const source = `schemaVersion: 1
apps:
  - id: nginx
    version: "20261113"
    tags: [网络, Web, 网络]
    ports: [{port: 8080, target: 80, desc: 默认端口}]
  - id: gallery-dl
    version: "1.0"
    tags: [下载, Web]
    rm: true
    restart: "no"
`

test("extracts unique tags in first-seen order and preserves application data", () => {
  const { appsJson, tagsJson } = convertApps(source)
  assert.deepEqual(JSON.parse(tagsJson), ["网络", "Web", "下载"])
  const { apps } = JSON.parse(appsJson)
  assert.deepEqual(apps[0].tags, ["网络", "Web", "网络"])
  assert.equal(apps[0].ports[0].target, 80)
  assert.equal(apps[1].rm, true)
  assert.equal(apps[1].restart, "no")
  assert.equal(convertApps(source).appsJson, appsJson)
})

test("allows empty application and tag arrays", () => {
  assert.deepEqual(
    JSON.parse(convertApps("schemaVersion: 1\napps: []").tagsJson),
    [],
  )
  assert.deepEqual(
    JSON.parse(
      convertApps(source.replaceAll(/tags: \[.*\]/g, "tags: []")).tagsJson,
    ),
    [],
  )
})

test("rejects malformed YAML, invalid schema, duplicate IDs and invalid tag/version types", () => {
  for (const invalid of [
    "apps: [",
    "schemaVersion: 2\napps: []",
    source.replace("gallery-dl", "nginx"),
    source.replace('"20261113"', "20261113"),
    source.replace("[下载, Web]", "下载"),
    source.replace("[下载, Web]", '[" "]'),
    source.replace("[下载, Web]", "[123]"),
  ]) {
    assert.throws(() => convertApps(invalid))
  }
})

test("writes matching data files and leaves previous outputs intact on validation failure", async () => {
  const root = await mkdtemp(join(tmpdir(), "dockergo-data-test-"))
  try {
    await mkdir(join(root, "datas"))
    await writeFile(join(root, "datas/apps.yaml"), source)
    await generateApps(root)
    for (const name of ["apps.json", "tags.json"]) {
      assert.equal(
        await readFile(join(root, "datas", name), "utf8"),
        await readFile(
          join(root, "luci-app-dockergo/root/usr/share/dockergo", name),
          "utf8",
        ),
      )
    }
    const before = await readFile(join(root, "datas/apps.json"), "utf8")
    await writeFile(join(root, "datas/apps.yaml"), "apps: invalid")
    await assert.rejects(generateApps(root))
    assert.equal(await readFile(join(root, "datas/apps.json"), "utf8"), before)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
