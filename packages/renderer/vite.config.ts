import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './', // 使用相对路径，确保打包到 asar 后资源以相对路径加载
  plugins: [react()],
  css: {
    postcss: './postcss.config.cjs',
  },
  esbuild: false, // 禁用esbuild，使用SWC
  build: {
    target: 'esnext',
    minify: 'terser', // 或者使用 'esbuild' 如果你想要更快的构建
  },
})
