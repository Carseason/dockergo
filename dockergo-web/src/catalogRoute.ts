export type CatalogRoute = {
  view: "installed" | "market"
  tag: string
}

export function parseCatalogRoute(hash: string): CatalogRoute {
  const [path, query = ""] = hash.replace(/^#/, "").split("?", 2)
  if (path !== "/market") return { view: "installed", tag: "" }
  return { view: "market", tag: new URLSearchParams(query).get("tag") || "" }
}

export function formatCatalogRoute(route: CatalogRoute): string {
  if (route.view === "installed") return "#/installed"
  const query = new URLSearchParams()
  if (route.tag) query.set("tag", route.tag)
  return `#/market${query.size ? `?${query}` : ""}`
}
