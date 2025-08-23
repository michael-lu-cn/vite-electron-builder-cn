import { execSync } from 'node:child_process'

function getElectronEnv() {
  // 在pnpm workspace中，优先使用pnpm exec
  const commands = [
    'pnpm exec electron -p "JSON.stringify(process.versions)"',
    'npx electron -p "JSON.stringify(process.versions)"',
  ]

  for (const cmd of commands) {
    try {
      return JSON.parse(
        execSync(cmd, {
          encoding: 'utf-8',
          env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: 1,
          },
        })
      )
    } catch (error) {
      console.warn(`Command "${cmd}" failed:`, error.message)
    }
  }

  throw new Error('Failed to get Electron versions with all available methods')
}

function createElectronEnvLoader() {
  let inMemoryCache = null

  return () => {
    if (inMemoryCache) {
      return inMemoryCache
    }

    inMemoryCache = getElectronEnv()
    return inMemoryCache
  }
}

const envLoader = createElectronEnvLoader()

export function getElectronVersions() {
  return envLoader()
}

export function getChromeVersion() {
  return getElectronVersions().chrome
}

export function getChromeMajorVersion() {
  return getMajorVersion(getChromeVersion())
}

export function getNodeVersion() {
  return getElectronVersions().node
}

export function getNodeMajorVersion() {
  return getMajorVersion(getNodeVersion())
}

function getMajorVersion(version) {
  return parseInt(version.split('.')[0], 10)
}
