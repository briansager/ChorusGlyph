import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function serveKuromojiDictionariesAsRawGzip(): Plugin {
  const setDictionaryHeaders = (url: string | undefined, response: { setHeader: (name: string, value: string) => void }) => {
    if (url?.startsWith('/dict/') && url.endsWith('.dat.gz')) {
      response.setHeader('Content-Encoding', 'identity')
      response.setHeader('Content-Type', 'application/octet-stream')
      response.setHeader('Cache-Control', 'no-cache, no-transform')
    }
  }

  return {
    name: 'serve-kuromoji-dictionaries-as-raw-gzip',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        setDictionaryHeaders((request as unknown as { url?: string }).url, response)
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        setDictionaryHeaders((request as unknown as { url?: string }).url, response)
        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react(), tailwindcss(), serveKuromojiDictionariesAsRawGzip()],
  }
})
