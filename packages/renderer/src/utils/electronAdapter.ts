// 使用全局声明的 ElectronAPI 类型（在 types/env.d.ts 中）
export type ElectronAPIShim = Partial<ElectronAPI>

/**
 * 尝试从 globalThis 读取由 preload 注入的键并构建 ElectronAPI 对象
 */
export function attachElectronAPIFromGlobal(): ElectronAPIShim | null {
  try {
    const names = [
      'getAppInfo',
      'getLogPath',
      'logError',
      'send',
      'sha256sum',
      'showMessage',
      'versions',
    ] as const

    const g = globalThis as unknown as Record<string, unknown>
    const entries: Array<[string, unknown]> = []
    for (const n of names) {
      const key = btoa(n)
      if (g[key] !== undefined) {
        entries.push([n, g[key]!])
      }
    }

    if (entries.length === 0) return null

    const result = Object.fromEntries(entries) as unknown as ElectronAPI
    return result
  } catch (err) {
    console.error('attachElectronAPIFromGlobal error', err)
    return null
  }
}
