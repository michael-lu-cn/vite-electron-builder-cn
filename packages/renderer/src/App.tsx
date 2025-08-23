import { useEffect, useState } from 'react'
import viteLogo from '/vite.svg'
import reactLogo from './assets/react.svg'
import Button from './components/ui/Button'
import './App.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useAppStore } from './store/useAppStore'
import { HealthChecker } from './utils/healthCheck'

function AppContent() {
  const { count, theme, increment, decrement, toggleTheme, reset } = useAppStore()
  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'unhealthy'>('checking')

  useEffect(() => {
    // 执行启动健康检查
    const performHealthCheck = async () => {
      try {
        const healthChecker = HealthChecker.getInstance()
        const result = await healthChecker.performHealthCheck()

        setHealthStatus(result.success ? 'healthy' : 'unhealthy')

        if (result.success) {
          // 启动运行时监控
          healthChecker.startRuntimeMonitoring()
        }
      } catch (error) {
        console.error('Health check failed:', error)
        setHealthStatus('unhealthy')
      }
    }

    performHealthCheck()
  }, [])

  return (
    <div className={`app ${theme}`}>
      <div className="container">
        <div className="brand-row">
          <a href="https://vite.dev" target="_blank" rel="noopener">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank" rel="noopener">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>
        <h1 className="app-title">Vite + React + Electron</h1>
        <h2 className="app-subtitle">现代化升级版：pnpm + Biome + SWC + Zustand</h2>

        {/* 健康状态指示器 */}
        <div
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            marginBottom: '16px',
            backgroundColor:
              healthStatus === 'healthy'
                ? '#e8f5e8'
                : healthStatus === 'unhealthy'
                  ? '#ffeaea'
                  : '#f0f0f0',
            color:
              healthStatus === 'healthy'
                ? '#2e7d32'
                : healthStatus === 'unhealthy'
                  ? '#d32f2f'
                  : '#666',
            fontSize: '14px',
          }}
        >
          状态:{' '}
          {healthStatus === 'checking'
            ? '检查中...'
            : healthStatus === 'healthy'
              ? '✅ 正常'
              : '❌ 异常'}
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Button onClick={decrement} className="btn btn-ghost">
                -
              </Button>
              <span className="count">{count}</span>
              <Button onClick={increment} className="btn btn-ghost">
                +
              </Button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
            <Button onClick={reset} className="btn btn-danger">
              Reset
            </Button>
            <Button onClick={toggleTheme} className="btn btn-primary">
              Switch to {theme === 'light' ? 'dark' : 'light'}
            </Button>
          </div>
          <p style={{ marginTop: 12 }}>
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
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}

export default App
