import type { AppInitConfig } from './AppInitConfig.js'
import { createModuleRunner } from './ModuleRunner.js'
import { terminateAppOnLastWindowClose } from './modules/ApplicationTerminatorOnLastWindowClose.js'
import { autoUpdater } from './modules/AutoUpdater.js'
import { allowInternalOrigins } from './modules/BlockNotAllowdOrigins.js'
import { chromeDevToolsExtension } from './modules/ChromeDevToolsExtension.js'
import { allowExternalUrls } from './modules/ExternalUrls.js'
import { hardwareAccelerationMode } from './modules/HardwareAccelerationModule.js'
import { Logger } from './modules/Logger.js'
import { disallowMultipleAppInstance } from './modules/SingleInstanceApp.js'
import { createWindowManagerModule } from './modules/WindowManager.js'

export async function initApp(initConfig: AppInitConfig) {
  // 初始化日志系统
  const _logger = new Logger()

  const moduleRunner = createModuleRunner()
    // Do not open devtools by default in development; keep current behavior controlled by env
    .init(createWindowManagerModule({ initConfig, openDevTools: false }))
    .init(disallowMultipleAppInstance())
    .init(terminateAppOnLastWindowClose())
    .init(hardwareAccelerationMode({ enable: false }))
    .init(autoUpdater())

    // Install React DevTools extension
    .init(chromeDevToolsExtension({ extension: 'REACT_DEVELOPER_TOOLS' }))

    // Security
    .init(
      allowInternalOrigins(
        new Set(initConfig.renderer instanceof URL ? [initConfig.renderer.origin] : [])
      )
    )
    .init(
      allowExternalUrls(
        new Set(
          initConfig.renderer instanceof URL
            ? [
                'https://vite.dev',
                'https://developer.mozilla.org',
                'https://react.dev',
                'https://www.typescriptlang.org',
                'https://zustand-demo.pmnd.rs', // Zustand 文档
              ]
            : []
        )
      )
    )

  await moduleRunner.run()
}
