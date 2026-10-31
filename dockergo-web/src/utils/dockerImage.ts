export function normalizeDockerImage(image: string) {
  const withoutDigest = image.split("@", 1)[0]
  const lastSlash = withoutDigest.lastIndexOf("/")
  const lastColon = withoutDigest.lastIndexOf(":")
  const withoutTag =
    lastColon > lastSlash ? withoutDigest.slice(0, lastColon) : withoutDigest

  return withoutTag
    .replace(/^(?:docker\.io|index\.docker\.io)\//, "")
    .replace(/^library\//, "")
}
