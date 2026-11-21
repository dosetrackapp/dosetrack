import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base: './' — чтобы собранное приложение работало из любой папки хостинга
// (например, https://имя.github.io/dosetrack/), а не только из корня сайта.
export default defineConfig({
  base: './',
  plugins: [react()],
})
