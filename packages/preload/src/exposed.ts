import { contextBridge } from 'electron'
import * as exports from './index.js'

const isExport = (key: string): key is keyof typeof exports => Object.hasOwn(exports, key)

for (const exportsKey in exports) {
  if (isExport(exportsKey)) {
    // biome-ignore lint/performance/noDynamicNamespaceImportAccess: 需要动态访问导出的函数
    const exportValue = exports[exportsKey]
    contextBridge.exposeInMainWorld(btoa(exportsKey), exportValue)
  }
}

// Re-export for tests
export * from './index.js'
