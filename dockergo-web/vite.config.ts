import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "")

  return {
    base: "./",
    plugins: [react()],
    build: {
      manifest: "manifest.json",
    },
    server: {
      host: "0.0.0.0",
      port: 37001,
      proxy: env.DOCKERGO_ROUTER_URL
        ? {
            "/cgi-bin/luci": {
              target: env.DOCKERGO_ROUTER_URL,
              changeOrigin: true,
            },
          }
        : undefined,
    },
    preview: {
      host: "0.0.0.0",
      port: 37001,
    },
  }
})
