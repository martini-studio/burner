import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

import { readFileSync, writeFileSync } from 'fs'

function swBuildHash(): Plugin {
  return {
    name: 'sw-build-hash',
    writeBundle(options) {
      const swPath = path.resolve(options.dir!, 'sw.js')
      const content = readFileSync(swPath, 'utf-8')
      writeFileSync(swPath, content.replace('__BUILD_HASH__', Date.now().toString(36)))
    },
  }
}

export default defineConfig({
  base: '/burner/',
  plugins: [react(), tailwindcss(), swBuildHash()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
  },
})
