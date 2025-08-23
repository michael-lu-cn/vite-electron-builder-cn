import { createHash } from 'node:crypto'
import { platform } from 'node:process'
import type { ElectronApplication, JSHandle } from '@playwright/test'
import { test as base, _electron as electron, expect } from '@playwright/test'
import type { BrowserWindow } from 'electron'
import { globSync } from 'glob'

process.env.PLAYWRIGHT_TEST = 'true'

// Declare the types of your fixtures.
type TestFixtures = {
  electronApp: ElectronApplication
  electronVersions: NodeJS.ProcessVersions
}

const test = base.extend<TestFixtures>({
  electronApp: [
    async ({}, use) => {
      /**
       * Executable path depends on root package name!
       */
      let executablePattern = 'dist/*/root{,.*}'
      if (platform === 'darwin') {
        executablePattern += '/Contents/*/root'
      }

      const [executablePath] = globSync(executablePattern)
      if (!executablePath) {
        throw new Error('App Executable path not found')
      }

      const electronApp = await electron.launch({
        executablePath: executablePath,
        args: ['--no-sandbox'],
      })

      electronApp.on('console', (msg) => {
        if (msg.type() === 'error') {
          console.error(`[electron][${msg.type()}] ${msg.text()}`)
        }
      })

      await use(electronApp)

      // This code runs after all the tests in the worker process.
      await electronApp.close()
    },
    { scope: 'worker', auto: true },
  ],

  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow()
    // capture errors
    page.on('pageerror', (error) => {
      console.error(error)
    })
    // capture console messages
    page.on('console', (msg) => {
      console.log(msg.text())
    })

    await page.waitForLoadState('load')
    await use(page)
  },

  electronVersions: async ({ electronApp }, use) => {
    await use(await electronApp.evaluate(() => process.versions))
  },
})

test('Main window state', async ({ electronApp, page }) => {
  const window: JSHandle<BrowserWindow> = await electronApp.browserWindow(page)
  const windowState = await window.evaluate(
    (
      mainWindow
    ): Promise<{ isVisible: boolean; isDevToolsOpened: boolean; isCrashed: boolean }> => {
      const getState = () => ({
        isVisible: mainWindow.isVisible(),
        isDevToolsOpened: mainWindow.webContents.isDevToolsOpened(),
        isCrashed: mainWindow.webContents.isCrashed(),
      })

      return new Promise((resolve) => {
        /**
         * The main window is created hidden, and is shown only when it is ready.
         * See {@link ../packages/main/src/mainWindow.ts} function
         */
        if (mainWindow.isVisible()) {
          resolve(getState())
        } else {
          mainWindow.once('ready-to-show', () => resolve(getState()))
        }
      })
    }
  )

  expect(windowState.isCrashed, 'The app has crashed').toEqual(false)
  expect(windowState.isVisible, 'The main window was not visible').toEqual(true)
  expect(windowState.isDevToolsOpened, 'The DevTools panel was open').toEqual(false)
})

test.describe('Main window web content', async () => {
  test('The main window has counter functionality', async ({ page }) => {
    // 测试计数显示
    const countDisplay = page.locator('.count')
    await expect(countDisplay).toBeVisible()
    await expect(countDisplay).toHaveText('count is 0')

    // 测试增加按钮
    const incrementBtn = page.getByRole('button', { name: '+' })
    await expect(incrementBtn).toBeVisible()
    await incrementBtn.click()
    await expect(countDisplay).toHaveText('count is 1')
  })

  test('The main window has a vite logo', async ({ page }) => {
    const element = page.getByAltText('Vite logo')
    await expect(element).toBeVisible()
    await expect(element).toHaveRole('img')
  })
})

test.describe('Basic functionality', async () => {
  test('Preload context is available', async ({ page }) => {
    // 简单测试preload是否工作
    const hasVersions = await page.evaluate(() => typeof globalThis[btoa('versions')] === 'object')
    expect(hasVersions).toBeTruthy()
  })
})
