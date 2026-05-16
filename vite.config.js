import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/withfedd-os/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        questionnaire: resolve(__dirname, 'questionnaire.html'),
      }
    }
  }
})
