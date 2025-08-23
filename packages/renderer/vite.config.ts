import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: false, // 禁用esbuild，使用SWC
  build: {
    target: 'esnext',
    minify: 'terser', // 或者使用 'esbuild' 如果你想要更快的构建
  },
})
