import { existsSync, readFileSync } from 'node:fs'
import { BrowserWindow } from 'electron'
import type { AppInitConfig } from '../AppInitConfig.js'
import type { AppModule } from '../AppModule.js'
import type { ModuleContext } from '../ModuleContext.js'

class WindowManager implements AppModule {
  readonly #preload: { path: string }
  readonly #renderer: { path: string } | URL
  readonly #openDevTools

  constructor({
    initConfig,
    openDevTools = false,
  }: { initConfig: AppInitConfig; openDevTools?: boolean }) {
    this.#preload = initConfig.preload
    this.#renderer = initConfig.renderer
    this.#openDevTools = openDevTools
  }

  async enable({ app }: ModuleContext): Promise<void> {
    await app.whenReady()
    await this.restoreOrCreateWindow(true)
    app.on('second-instance', () => this.restoreOrCreateWindow(true))
    app.on('activate', () => this.restoreOrCreateWindow(true))
  }

  async createWindow(): Promise<BrowserWindow> {
    const preloadPath = this.#preload.path

    // 使用 Logger 替代 console 输出；在生产环境中保持静默，仅在 DEBUG 环境打印
    try {
      const exists = existsSync(preloadPath)
      if (process.env.DEBUG === 'true') {
        console.debug('[preload-check] path=', preloadPath, 'exists=', exists)
        if (exists) {
          const head = readFileSync(preloadPath, 'utf8').slice(0, 400)
          console.debug(
            '[preload-check] containsExposeInMainWorld=',
            head.includes('exposeInMainWorld') || head.includes('contextBridge.exposeInMainWorld')
          )
        }
      }
    } catch (err) {
      if (process.env.DEBUG === 'true') {
        console.error('[preload-check] error reading preload file', err)
      }
    }

    const browserWindow = new BrowserWindow({
      show: false, // Use the 'ready-to-show' event to show the instantiated BrowserWindow.
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false, // Sandbox disabled because the demo of preload script depend on the Node.js api
        webviewTag: false, // The webview tag is not recommended. Consider alternatives like an iframe or Electron's BrowserView. @see https://www.electronjs.org/docs/latest/api/webview-tag#warning
        preload: preloadPath,
      },
    })

    if (this.#renderer instanceof URL) {
      await browserWindow.loadURL(this.#renderer.href)
    } else {
      await browserWindow.loadFile(this.#renderer.path)
    }

    return browserWindow
  }

  async restoreOrCreateWindow(show = false) {
    let window = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed())

    if (window === undefined) {
      window = await this.createWindow()
    }

    if (!show) {
      return window
    }

    if (window.isMinimized()) {
      window.restore()
    }

    window?.show()

    if (this.#openDevTools) {
      window?.webContents.openDevTools()
    }

    window.focus()

    return window
  }
}

export function createWindowManagerModule(...args: ConstructorParameters<typeof WindowManager>) {
  return new WindowManager(...args)
}
