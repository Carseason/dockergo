import { test } from "node:test"
import assert from "node:assert/strict"
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  writeFile,
  rm,
} from "node:fs/promises"
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
  const { appsJson } = convertApps(source)
  const { apps, tags, schemaVersion } = JSON.parse(appsJson)
  assert.equal(schemaVersion, 1)
  assert.deepEqual(tags, ["网络", "Web", "下载"])
  assert.deepEqual(apps[0].tags, ["网络", "Web", "网络"])
  assert.equal(apps[0].ports[0].target, 80)
  assert.equal(apps[1].rm, true)
  assert.equal(apps[1].restart, "no")
  assert.equal(convertApps(source).appsJson, appsJson)
})

test("allows empty application and tag arrays", () => {
  assert.deepEqual(
    JSON.parse(convertApps("schemaVersion: 1\napps: []").appsJson).tags,
    [],
  )
  assert.deepEqual(
    JSON.parse(
      convertApps(source.replaceAll(/tags: \[.*\]/g, "tags: []")).appsJson,
    ).tags,
    [],
  )
})

test("recomputes root tags from application associations", () => {
  const { appsJson } = convertApps("tags: [obsolete]\n" + source)
  assert.deepEqual(JSON.parse(appsJson).tags, ["网络", "Web", "下载"])
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

test("writes only datas/apps.json and leaves previous output intact on validation failure", async () => {
  const root = await mkdtemp(join(tmpdir(), "dockergo-data-test-"))
  try {
    await mkdir(join(root, "datas"))
    await writeFile(join(root, "datas/apps.yaml"), source)
    await generateApps(root)
    assert.equal(
      await readFile(join(root, "datas/apps.json"), "utf8"),
      convertApps(source).appsJson,
    )
    assert.deepEqual((await readdir(join(root, "datas"))).sort(), [
      "apps.json",
      "apps.yaml",
    ])
    await assert.rejects(access(join(root, "luci-app-dockergo")), {
      code: "ENOENT",
    })
    const before = await readFile(join(root, "datas/apps.json"), "utf8")
    await writeFile(join(root, "datas/apps.yaml"), "apps: invalid")
    await assert.rejects(generateApps(root))
    assert.equal(await readFile(join(root, "datas/apps.json"), "utf8"), before)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
