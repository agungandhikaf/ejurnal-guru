import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const appEnvironment = process.env.APP_ENV === 'prod' ? 'prod' : 'dev'

export default defineConfig({
  main: {
    define: {
      // Tanam environment ke bundle main process saat build agar nilai tetap
      // tersedia ketika aplikasi hasil DMG dijalankan.
      'process.env.APP_ENV': JSON.stringify(appEnvironment)
    },
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        // Native Node modules must stay external so Electron can load
        // their compiled .node binaries directly from node_modules.
        external: ['better-sqlite3']
      }
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@main': resolve('src/main')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    root: resolve('src/renderer'),
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()]
  }
})
