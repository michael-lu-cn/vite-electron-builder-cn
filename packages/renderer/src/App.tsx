import viteLogo from '/vite.svg'
import reactLogo from './assets/react.svg'
import './App.css'
import { useAppStore } from './store/useAppStore'

function App() {
  const { count, theme, increment, decrement, toggleTheme, reset } = useAppStore()

  return (
    <div className={`app ${theme}`}>
      <div>
        <a href="https://vite.dev" target="_blank" rel="noopener">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noopener">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React + Electron</h1>
      <h2>现代化升级版：pnpm + Biome + SWC + Zustand</h2>

      <div className="card">
        <div className="counter-controls">
          <button type="button" onClick={decrement}>
            -
          </button>
          <span className="count">count is {count}</span>
          <button type="button" onClick={increment}>
            +
          </button>
        </div>
        <button type="button" onClick={reset} className="reset-btn">
          Reset
        </button>
        <button type="button" onClick={toggleTheme} className="theme-btn">
          Switch to {theme === 'light' ? 'dark' : 'light'} theme
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>

      <div className="features">
        <h3>✨ 升级特性</h3>
        <ul>
          <li>⚡ pnpm - 更快的包管理器</li>
          <li>🔧 Biome - 统一的代码检查和格式化</li>
          <li>🦀 SWC - 基于 Rust 的超快编译器</li>
          <li>🐻 Zustand - 轻量级状态管理</li>
          <li>🛠️ React Developer Tools 已启用</li>
        </ul>
      </div>

      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
    </div>
  )
}

export default App
