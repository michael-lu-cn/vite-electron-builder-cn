import { fileURLToPath } from 'node:url'
import { initApp } from '@app/main'

if (
  process.env.NODE_ENV === 'development' ||
  process.env.PLAYWRIGHT_TEST === 'true' ||
  !!process.env.CI
) {
  function showAndExit(...args) {
    console.error(...args)
    process.exit(1)
  }

  process.on('uncaughtException', showAndExit)
  process.on('unhandledRejection', showAndExit)
}

// noinspection JSIgnoredPromiseFromCall
/**
 * We resolve '@app/renderer' and '@app/preload'
 * here and not in '@app/main'
 * to observe good practices of modular design.
 * This allows fewer dependencies and better separation of concerns in '@app/main'.
 * Thus,
 * the main module remains simplistic and efficient
 * as it receives initialization instructions rather than direct module imports.
 */
initApp({
  renderer:
    process.env.MODE === 'development' && !!process.env.VITE_DEV_SERVER_URL
      ? new URL(process.env.VITE_DEV_SERVER_URL)
      : {
          path: fileURLToPath(import.meta.resolve('@app/renderer')),
        },

  preload: {
    path: (() => {
      try {
        // 尝试使用模块解析（开发环境）
        return fileURLToPath(import.meta.resolve('@app/preload/exposed.mjs'))
      } catch (_error) {
        // 回退到相对路径（生产环境）
        console.log('Using fallback preload path for production')
        return fileURLToPath(
          new URL('./node_modules/@app/preload/dist/exposed.mjs', import.meta.url)
        )
      }
    })(),
  },
})
