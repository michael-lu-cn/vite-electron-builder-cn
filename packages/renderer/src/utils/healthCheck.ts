interface HealthCheckResult {
  success: boolean
  checks: {
    electronAPI: boolean
    localStorage: boolean
    zustand: boolean
    react: boolean
  }
  errors: string[]
  timestamp: string
}

export class HealthChecker {
  private static instance: HealthChecker
  private checkResults: HealthCheckResult | null = null

  static getInstance(): HealthChecker {
    if (!HealthChecker.instance) {
      HealthChecker.instance = new HealthChecker()
    }
    return HealthChecker.instance
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const errors: string[] = []
    const checks = {
      electronAPI: false,
      localStorage: false,
      zustand: false,
      react: false,
    }

    // 检查 Electron API
    try {
      checks.electronAPI = typeof (window as any).electronAPI !== 'undefined'
      if (!checks.electronAPI) {
        errors.push('Electron API not available')
      }
    } catch (error) {
      errors.push(`Electron API check failed: ${error}`)
    }

    // 检查 localStorage
    try {
      const testKey = '__health_check_test__'
      localStorage.setItem(testKey, 'test')
      const retrieved = localStorage.getItem(testKey)
      localStorage.removeItem(testKey)
      checks.localStorage = retrieved === 'test'
      if (!checks.localStorage) {
        errors.push('localStorage not working properly')
      }
    } catch (error) {
      errors.push(`localStorage check failed: ${error}`)
    }

    // 检查 Zustand (通过动态导入)
    try {
      const { useAppStore } = await import('../store/useAppStore')
      const store = useAppStore.getState()
      checks.zustand = typeof store === 'object' && store !== null
      if (!checks.zustand) {
        errors.push('Zustand store not initialized properly')
      }
    } catch (error) {
      errors.push(`Zustand check failed: ${error}`)
    }

    // 检查 React
    try {
      const React = await import('react')
      checks.react = typeof React.createElement === 'function'
      if (!checks.react) {
        errors.push('React not available')
      }
    } catch (error) {
      errors.push(`React check failed: ${error}`)
    }

    const result: HealthCheckResult = {
      success: errors.length === 0,
      checks,
      errors,
      timestamp: new Date().toISOString(),
    }

    this.checkResults = result

    // 记录健康检查结果
    this.logHealthCheck(result)

    return result
  }

  private logHealthCheck(result: HealthCheckResult) {
    const logData = {
      type: 'health-check',
      result,
      userAgent: navigator.userAgent,
      timestamp: result.timestamp,
    }

    if ((window as any).electronAPI?.logError) {
      ;(window as any).electronAPI.logError('health-check', logData)
    }

    if (result.success) {
      console.log('✅ Health check passed:', result)
    } else {
      console.error('❌ Health check failed:', result)
    }
  }

  getLastCheckResult(): HealthCheckResult | null {
    return this.checkResults
  }

  // 监控运行时健康状态
  startRuntimeMonitoring() {
    // 监听未捕获的错误
    window.addEventListener('error', (event) => {
      this.logRuntimeError('uncaught-error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack,
      })
    })

    // 监听未捕获的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.logRuntimeError('unhandled-rejection', {
        reason: event.reason,
        promise: event.promise,
      })
    })

    // 定期检查关键功能
    setInterval(() => {
      this.performQuickCheck()
    }, 30000) // 每30秒检查一次
  }

  private async performQuickCheck() {
    try {
      // 快速检查关键功能是否正常
      const quickChecks = {
        localStorage: this.checkLocalStorage(),
        zustand: await this.checkZustand(),
      }

      const hasIssues = Object.values(quickChecks).some((check) => !check)

      if (hasIssues) {
        console.warn('⚠️ Quick health check detected issues:', quickChecks)

        if ((window as any).electronAPI?.logError) {
          ;(window as any).electronAPI.logError('runtime-health-issue', {
            checks: quickChecks,
            timestamp: new Date().toISOString(),
          })
        }
      }
    } catch (error) {
      console.error('Quick health check failed:', error)
    }
  }

  private checkLocalStorage(): boolean {
    try {
      const testKey = '__quick_check__'
      localStorage.setItem(testKey, 'test')
      const result = localStorage.getItem(testKey) === 'test'
      localStorage.removeItem(testKey)
      return result
    } catch {
      return false
    }
  }

  private async checkZustand(): Promise<boolean> {
    try {
      const { useAppStore } = await import('../store/useAppStore')
      const state = useAppStore.getState()
      return typeof state === 'object' && state !== null
    } catch {
      return false
    }
  }

  private logRuntimeError(type: string, errorData: any) {
    const logData = {
      type,
      errorData,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }

    if ((window as any).electronAPI?.logError) {
      ;(window as any).electronAPI.logError('runtime-error', logData)
    }

    console.error(`Runtime error (${type}):`, logData)
  }
}
