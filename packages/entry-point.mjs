import { dirname, join } from 'node:path'
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
      : (() => {
          try {
            return { path: fileURLToPath(import.meta.resolve('@app/renderer')) }
          } catch (_e) {
            // Fallback to local workspace renderer build output
            return {
              path: join(dirname(fileURLToPath(import.meta.url)), 'renderer', 'dist', 'index.html'),
            }
          }
        })(),

  preload: {
    // Resolve preload via package export to match how it is packaged into app.asar
    // e.g. resolves to node_modules/@app/preload/dist/exposed.mjs inside asar
    // In development mode import.meta.resolve may not find workspace packages by name,
    // so fallback to local packages path if resolution fails.
    path: (() => {
      try {
        return fileURLToPath(import.meta.resolve('@app/preload/exposed.mjs'))
      } catch (_e) {
        // Fallback to local package build output in mono-repo
        return join(dirname(fileURLToPath(import.meta.url)), 'preload', 'dist', 'exposed.mjs')
      }
    })(),
  },
})
