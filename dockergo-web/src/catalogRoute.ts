export type CatalogRoute = {
  view: "installed" | "market"
  tag: string
}

export function parseCatalogRoute(
  pathname: string,
  basePath = "",
): CatalogRoute {
  const base = basePath.replace(/\/$/, "")
  if (pathname === `${base}/market` || pathname === `${base}/market/`) {
    return { view: "market", tag: "" }
  }
  const prefix = `${base}/market/tag/`
  if (pathname.startsWith(prefix)) {
    const encodedTag = pathname.slice(prefix.length)
    if (/^t-(?:[a-f0-9]{2})+$/.test(encodedTag)) {
      try {
        const bytes = Uint8Array.from(
          encodedTag.slice(2).match(/../g) || [],
          (byte) => parseInt(byte, 16),
        )
        return {
          view: "market",
          tag: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
        }
      } catch {
        // Invalid encoded paths fall back to the installed view.
      }
    }
  }
  return { view: "installed", tag: "" }
}

export function formatCatalogRoute(route: CatalogRoute, basePath = ""): string {
  const base = basePath.replace(/\/$/, "")
  if (route.view === "installed") return `${base}/installed`
  // LuCI login redirects filter path segments; keep tag tokens entirely ASCII.
  const tag = Array.from(new TextEncoder().encode(route.tag), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
  return `${base}/market${route.tag ? `/tag/t-${tag}` : ""}`
}
