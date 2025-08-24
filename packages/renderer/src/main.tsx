import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { attachElectronAPIFromGlobal } from './utils/electronAdapter'

// 在渲染进程启动时，把由 preload 暴露的 API 挂载到 window.electronAPI
// 避免在浏览器端静态解析 `import('@app/preload')`（Vite 在 dev 环境可能无法解析包名），
// 我们直接从 globalThis 读取 preload 在主进程中通过 contextBridge 注入的键。
;(function attachElectronAPIFromGlobalEntry() {
  const api = attachElectronAPIFromGlobal()
  if (api) {
    ;(window as unknown as { electronAPI?: ElectronAPI }).electronAPI =
      api as unknown as ElectronAPI
    console.log('[renderer] electronAPI attached via globalThis', Object.keys(api))
  } else {
    console.log('[renderer] no electronAPI found on globalThis')
  }
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
