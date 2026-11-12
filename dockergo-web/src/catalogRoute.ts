export type CatalogRoute = {
  view: "installed" | "market"
}

export function parseCatalogRoute(
  pathname: string,
  basePath = "",
): CatalogRoute {
  const base = basePath.replace(/\/$/, "")
  const marketPath = `${base}/market`
  // Keep old market subpaths reachable while discarding their tag selection.
  return {
    view:
      pathname === marketPath || pathname.startsWith(`${marketPath}/`)
        ? "market"
        : "installed",
  }
}

export function formatCatalogRoute(route: CatalogRoute, basePath = ""): string {
  const base = basePath.replace(/\/$/, "")
  if (route.view === "installed") return `${base}/installed`
  return `${base}/market`
}
