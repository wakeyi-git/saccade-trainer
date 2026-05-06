import { defineConfig } from 'vite'

export default defineConfig({
  base: '/saccade-trainer/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022'
  }
})
