import type { AppModule } from '../AppModule.js'
import type { ModuleContext } from '../ModuleContext.js'

export class ChromeDevToolsExtension implements AppModule {
  readonly #extensionName: string

  constructor({ extension }: { readonly extension: string }) {
    this.#extensionName = extension
  }

  async enable({ app }: ModuleContext): Promise<void> {
    // 只在开发环境中安装扩展
    if (!import.meta.env.DEV) {
      return
    }

    try {
      await app.whenReady()

      // 动态导入 electron-devtools-installer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const installer = (await import('electron-devtools-installer')) as any
      const { REACT_DEVELOPER_TOOLS, default: installExtension } = installer

      // 根据扩展名称选择对应的扩展
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let extensionId: any
      switch (this.#extensionName) {
        case 'REACT_DEVELOPER_TOOLS':
          extensionId = REACT_DEVELOPER_TOOLS
          break
        default:
          console.warn(`Unknown extension: ${this.#extensionName}`)
          return
      }

      await installExtension(extensionId)
    } catch (error) {
      console.warn('Failed to install Chrome DevTools extension:', error)
    }
  }
}

export function chromeDevToolsExtension(
  ...args: ConstructorParameters<typeof ChromeDevToolsExtension>
) {
  return new ChromeDevToolsExtension(...args)
}
