import { execSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

// Support require in this ESM module
const require = createRequire(import.meta.url)

import { build, createServer } from 'vite'

// force development mode flags for this script; ensure we run repairs only locally
const mode = 'development'
if (!process.env.NODE_ENV) process.env.NODE_ENV = mode
process.env.MODE = process.env.MODE || mode

const isCI = !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.GITLAB_CI)
const ELECTRON_VERSION = '37.3.1'
const ELECTRON_MARKER_FILE = path.resolve(
  'node_modules',
  `.electron_installed_v${ELECTRON_VERSION}`
)

function runCmd(cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: 'inherit', ...opts })
  } catch (e) {
    // rethrow for callers if they need to handle
    throw e
  }
}

function fileExists(p) {
  try {
    return fs.existsSync(p)
  } catch {
    return false
  }
}

function isElectronAvailable() {
  // First try to require electron in a fresh Node subprocess to ensure runtime works
  try {
    const out = execSync("node -e \"console.log(require('electron')?.version||'')\"", {
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10_000,
    })
      .toString()
      .trim()
    if (out) {
      console.info('Electron child-resolve reports version', out)
      return true
    }
  } catch (e) {
    // child resolve failed; fallthrough to filesystem checks
  }

  // Check for platform-specific electron binaries in project layout
  try {
    if (process.platform === 'darwin') {
      const macPath = path.resolve(
        'node_modules',
        'electron',
        'dist',
        'Electron.app',
        'Contents',
        'MacOS',
        'Electron'
      )
      if (fileExists(macPath)) return true
    } else if (process.platform === 'linux') {
      const linuxPath = path.resolve('node_modules', 'electron', 'dist', 'electron')
      if (fileExists(linuxPath)) return true
    } else if (process.platform === 'win32') {
      const winPath = path.resolve('node_modules', 'electron', 'dist', 'electron.exe')
      if (fileExists(winPath)) return true
    }
  } catch (e) {
    // ignore
  }

  // Check pnpm store for electron package with dist present
  const pnpmDir = path.resolve('node_modules', '.pnpm')
  if (fileExists(pnpmDir)) {
    try {
      const entries = fs.readdirSync(pnpmDir)
      for (const ent of entries) {
        if (!ent.startsWith('electron@')) continue
        const candidateDist = path.join(pnpmDir, ent, 'node_modules', 'electron', 'dist')
        if (fileExists(candidateDist)) {
          // platform-specific check inside that dist
          const mac = path.join(candidateDist, 'Electron.app', 'Contents', 'MacOS', 'Electron')
          const lin = path.join(candidateDist, 'electron')
          const win = path.join(candidateDist, 'electron.exe')
          if (fileExists(mac) || fileExists(lin) || fileExists(win)) return true
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return false
}

async function tryEnsureElectron() {
  // skip automatic repairs in CI
  if (isCI) {
    console.info('CI environment detected — skipping local Electron auto-repair')
    return
  }

  // fast check using improved availability probe
  if (isElectronAvailable()) {
    console.info('Electron appears available; skipping repair')
    return
  }
  console.warn('Electron not found or failed to resolve — attempting mirror-based reinstall')

  try {
    // Only remove existing installs if we don't have a successful-install marker
    // or if user explicitly requests a reinstall via FORCE_ELECTRON_REINSTALL
    if (!process.env.FORCE_ELECTRON_REINSTALL && fileExists(ELECTRON_MARKER_FILE)) {
      console.info('Found existing electron install marker, skipping aggressive cleanup')
    } else {
      runCmd('rm -rf node_modules/.pnpm/electron* node_modules/electron* || true')
    }

    // choose mirror (environment or default)
    const mirror =
      process.env.ELECTRON_MIRROR ||
      process.env.npm_config_electron_mirror ||
      'https://npmmirror.com/mirrors/electron/'
    console.info('Using ELECTRON_MIRROR=', mirror)
    process.env.ELECTRON_MIRROR = mirror
    process.env.npm_config_electron_mirror = mirror

    // Try to install electron via pnpm in workspace root, restricting effects
    // Use install with filter to only fetch electron package change
    try {
      runCmd(`pnpm install --filter electron --workspace-root`)
    } catch (errInstall) {
      console.warn('pnpm install --filter electron failed, falling back to pnpm add -w electron')
      try {
        runCmd(`pnpm add -w electron@${ELECTRON_VERSION}`)
      } catch (errAdd) {
        console.warn('pnpm add fallback failed:', errAdd && errAdd.message)
      }
    }

    // After install attempt, check for common electron executable paths
    const checks = [
      path.resolve('node_modules/electron/cli.js'),
      // pnpm layout
      path.resolve(
        'node_modules/.pnpm/electron@' + ELECTRON_VERSION + '_*/node_modules/electron/cli.js'
      ),
      path.resolve('node_modules/.pnpm/*/node_modules/electron/cli.js'),
    ]
    const found = checks.some((p) => fileExists(p))
    if (found) {
      console.info('Electron install artifacts detected')
      try {
        // verify require works
        // eslint-disable-next-line no-unused-expressions
        require.resolve('electron')
        try {
          fs.writeFileSync(ELECTRON_MARKER_FILE, new Date().toISOString())
        } catch (e) {
          console.warn('Could not write electron marker file:', e && e.message)
        }
        return
      } catch (verifyErr) {
        console.warn('verify require electron failed:', verifyErr && verifyErr.message)
      }
    }

    // If we reach here, pnpm did not perform the binary install correctly. Try direct mirror binary download.
    console.info('Attempting direct binary download from mirror...')
    await downloadAndUnpackElectron(mirror, ELECTRON_VERSION)

    // final verify
    try {
      // eslint-disable-next-line no-unused-expressions
      require.resolve('electron')
      console.info('Electron resolved after direct download')
      try {
        fs.writeFileSync(ELECTRON_MARKER_FILE, new Date().toISOString())
      } catch (e) {
        console.warn('Could not write electron marker file:', e && e.message)
      }
      return
    } catch (finalErr) {
      console.error('Electron still not resolvable after attempts:', finalErr && finalErr.message)
    }
  } catch (err) {
    console.error(
      'Unexpected error while ensuring electron:',
      err && err.message ? err.message : err
    )
  }
}

async function downloadAndUnpackElectron(mirror, version) {
  const plat = process.platform
  const arch = process.arch === 'x64' ? 'x64' : process.arch === 'arm64' ? 'arm64' : process.arch
  const filename = `electron-v${version}-${plat}-${arch}.zip`
  // mac arm64 naming may be darwin-arm64 etc — assume default mapping above
  const tmp = `/tmp/electron-${version}-${plat}-${arch}`
  // build candidate URLs: mirror/v<version>/filename and mirror/filename
  const candidates = []
  if (mirror.endsWith('/')) {
    candidates.push(mirror + 'v' + version + '/' + filename)
    candidates.push(mirror + filename)
  } else {
    candidates.push(mirror + '/v' + version + '/' + filename)
    candidates.push(mirror + '/' + filename)
  }

  try {
    runCmd(`rm -rf ${tmp} && mkdir -p ${tmp}`)
    let downloaded = false
    for (const url of candidates) {
      try {
        console.info('Trying download', url)
        runCmd(`curl -fSL "${url}" -o ${tmp}/electron.zip`)
        downloaded = true
        break
      } catch (e) {
        console.warn('Download failed for', url)
      }
    }
    if (!downloaded) throw new Error('All mirror download attempts failed')
    // Unpack depending on archive
    if (filename.endsWith('.zip')) {
      runCmd(`unzip -o ${tmp}/electron.zip -d ${tmp}`)
    } else {
      runCmd(`tar -xf ${tmp}/electron.zip -C ${tmp}`)
    }

    // Place into node_modules/electron/dist
    const dest = path.resolve('node_modules/electron/dist')
    runCmd(
      `rm -rf node_modules/electron || true && mkdir -p node_modules/electron && mkdir -p ${dest}`
    )
    // move unpacked contents into dist (will be applied after package copy if present)
    console.info('Electron binary unpacked to', dest)

    // Help electron package find the unpacked binary by overriding dist path
    try {
      process.env.ELECTRON_OVERRIDE_DIST_PATH = dest
      console.info('Set ELECTRON_OVERRIDE_DIST_PATH=', process.env.ELECTRON_OVERRIDE_DIST_PATH)
    } catch (e) {
      console.warn('Could not set ELECTRON_OVERRIDE_DIST_PATH:', e && e.message)
    }

    // Ensure full electron package is present in node_modules/electron by copying from pnpm store if present
    try {
      const pnpmDir = path.resolve('node_modules/.pnpm')
      if (fileExists(pnpmDir)) {
        const entries = fs.readdirSync(pnpmDir)
        const electronPkgDir = entries.find((d) => d.startsWith('electron@' + version))
        if (electronPkgDir) {
          const srcPkg = path.join(pnpmDir, electronPkgDir, 'node_modules', 'electron')
          const dstPkg = path.resolve('node_modules', 'electron')
          if (fileExists(srcPkg)) {
            runCmd(`rm -rf ${dstPkg} && cp -R ${srcPkg} ${dstPkg}`)
            console.info('Copied electron package from pnpm store to', dstPkg)
            // after copying package, ensure unpacked binary is placed into package dist
            try {
              runCmd(`cp -R ${tmp}/* ${dstPkg}/dist`)
              console.info('Overlayed unpacked binary into', path.join(dstPkg, 'dist'))
            } catch (e) {
              console.warn('Could not overlay unpacked binary into package dist:', e && e.message)
            }

            // ensure electron path.txt exists so electron/index.js can locate the binary
            try {
              const execRel =
                process.platform === 'darwin'
                  ? path.join('Electron.app', 'Contents', 'MacOS', 'Electron')
                  : process.platform === 'win32'
                    ? 'electron.exe'
                    : 'electron'
              const pathTxt = path.join(dstPkg, 'path.txt')
              fs.writeFileSync(pathTxt, execRel, 'utf8')
              // ensure no trailing newline or whitespace which can break spawning
              try {
                const trimmed = fs.readFileSync(pathTxt, 'utf8').trim()
                fs.writeFileSync(pathTxt, trimmed, 'utf8')
              } catch (e) {
                // ignore
              }
              console.info('Wrote electron path.txt at', pathTxt, '->', execRel)
            } catch (e) {
              console.warn('Failed to write path.txt in', dstPkg, e && e.message)
            }

            // also ensure node_modules/electron/dist contains the unpacked content and path.txt
            try {
              const nmDist = path.resolve('node_modules', 'electron', 'dist')
              runCmd(`mkdir -p ${nmDist}`)
              runCmd(`cp -R ${tmp}/* ${nmDist} || true`)
              const nmPathTxt = path.join(path.resolve('node_modules', 'electron'), 'path.txt')
              const execRel2 =
                process.platform === 'darwin'
                  ? path.join('Electron.app', 'Contents', 'MacOS', 'Electron')
                  : process.platform === 'win32'
                    ? 'electron.exe'
                    : 'electron'
              try {
                fs.writeFileSync(nmPathTxt, execRel2, 'utf8')
                fs.writeFileSync(nmPathTxt, fs.readFileSync(nmPathTxt, 'utf8').trim(), 'utf8')
                console.info('Wrote', nmPathTxt)
              } catch (e) {
                console.warn('Failed to write node_modules electron path.txt:', e && e.message)
              }
            } catch (e) {
              console.warn(
                'Failed to copy unpacked binary to node_modules/electron/dist or write path.txt:',
                e && e.message
              )
            }
          }
        }
      }
    } catch (ex) {
      console.warn('Could not copy electron package from pnpm store:', ex && ex.message)
    }

    // Create platform-specific executable shim/link at node_modules/electron/dist/electron
    try {
      const distDir = path.resolve('node_modules', 'electron', 'dist')
      // macOS: create symlink dist/electron -> dist/Electron.app/Contents/MacOS/Electron
      if (process.platform === 'darwin') {
        // Try multiple candidate targets for the real macOS binary
        const candidates = [
          path.join(distDir, 'Electron.app', 'Contents', 'MacOS', 'Electron'),
          // pnpm store location
          path.join(
            'node_modules',
            '.pnpm',
            `electron@${version}`,
            'node_modules',
            'electron',
            'dist',
            'Electron.app',
            'Contents',
            'MacOS',
            'Electron'
          ),
          // temp unpack location
          path.join(
            '/tmp',
            `electron-${version}-darwin-x64`,
            'Electron.app',
            'Contents',
            'MacOS',
            'Electron'
          ),
        ]

        let realTarget = null
        for (const c of candidates) {
          if (fileExists(c)) {
            realTarget = c
            break
          }
        }

        const shimPath = path.join(distDir, 'electron')
        if (realTarget) {
          const shimContent = `#!/bin/sh\nexec "${realTarget}" "$@"\n`
          try {
            fs.mkdirSync(distDir, { recursive: true })
            fs.writeFileSync(shimPath, shimContent, { mode: 0o755 })
            fs.chmodSync(shimPath, 0o755)
            console.info('Wrote macOS electron shim to', shimPath, '->', realTarget)
          } catch (e) {
            console.warn('Failed to write macOS electron shim:', e && e.message)
          }
        } else {
          console.warn('macOS electron binary not found in any candidate locations')
        }
      } else if (process.platform === 'linux') {
        // linux: ensure an executable exists at dist/electron (usually provided by unpack)
        const linuxBin = path.join(distDir, 'electron')
        if (fileExists(linuxBin)) {
          fs.chmodSync(linuxBin, 0o755)
          console.info('Linux electron binary present at', linuxBin)
        } else {
          console.warn('Linux electron binary not found at', linuxBin)
        }
      } else if (process.platform === 'win32') {
        const winTarget = path.join(distDir, 'electron.exe')
        if (fileExists(winTarget)) {
          console.info('Windows electron binary present at', winTarget)
        } else {
          console.warn('Windows electron.exe not found at', winTarget)
        }
      }
    } catch (shimErr) {
      console.warn('Could not create electron shim/link:', shimErr && shimErr.message)
    }
  } catch (e) {
    console.error('Failed to download or unpack Electron binary:', e && e.message ? e.message : e)
    throw e
  }
}

// run the ensure step synchronously before proceeding
try {
  // eslint-disable-next-line no-await-in-loop
  await tryEnsureElectron()
} catch (e) {
  console.warn('ensureElectron step completed with errors:', e && e.message)
}

/**
 * This script is designed to run multiple packages of your application in a special development mode.
 * To do this, you need to follow a few steps:
 */

/**
 * 1. We create a few flags to let everyone know that we are in development mode.
 */
// `mode` is initialized earlier; ensure MODE env is set
process.env.MODE = process.env.MODE || mode

/**
 * 2. We create a development server for the renderer. It is assumed that the renderer exists and is located in the “renderer” package.
 * This server should be started first because other packages depend on its settings.
 */
/**
 * @type {import('vite').ViteDevServer}
 */
const rendererWatchServer = await createServer({
  mode,
  root: path.resolve('packages/renderer'),
})

await rendererWatchServer.listen()

/**
 * 3. We are creating a simple provider plugin.
 * Its only purpose is to provide access to the renderer dev-server to all other build processes.
 */
/** @type {import('vite').Plugin} */
const rendererWatchServerProvider = {
  name: '@app/renderer-watch-server-provider',
  api: {
    provideRendererWatchServer() {
      return rendererWatchServer
    },
  },
}

/**
 * 4. Start building all other packages.
 * For each of them, we add a plugin provider so that each package can implement its own hot update mechanism.
 */

/** @type {string[]} */
const packagesToStart = ['packages/preload', 'packages/main']

for (const pkg of packagesToStart) {
  await build({
    mode,
    root: path.resolve(pkg),
    plugins: [rendererWatchServerProvider],
  })
}
