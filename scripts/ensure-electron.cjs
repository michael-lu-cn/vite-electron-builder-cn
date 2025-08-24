const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

function fileExists(p) {
  try {
    return fs.existsSync(p)
  } catch {
    return false
  }
}

const isCI = !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.GITLAB_CI)
const ELECTRON_VERSION = '37.3.1'

function electronBinaryPaths() {
  const base = path.resolve('node_modules', 'electron', 'dist')
  return [
    path.join(base, 'electron'),
    path.join(base, 'electron.exe'),
    path.join(base, 'Electron.app', 'Contents', 'MacOS', 'Electron'),
  ]
}

function checkBinaryPresent() {
  const paths = electronBinaryPaths()
  for (const p of paths) {
    if (fileExists(p)) return p
  }
  return null
}

try {
  if (isCI) {
    console.info('CI detected — skipping local electron install step')
    process.exit(0)
  }

  const found = checkBinaryPresent()
  if (found) {
    console.info('Electron binary already present at', found)
    process.exit(0)
  }

  console.info(
    'Electron binary not found — cleaning residues and attempting pnpm install with mirror'
  )
  const mirror = process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/'
  process.env.ELECTRON_MIRROR = mirror
  process.env.npm_config_electron_mirror = mirror

  try {
    // remove possible broken installs
    try {
      execSync('rm -rf node_modules/.pnpm/electron* node_modules/electron*', { stdio: 'inherit' })
    } catch {}

    // pre-approve electron build scripts so pnpm will run postinstall
    try {
      // non-interactively approve electron build scripts (POSIX shell)
      try {
        execSync('printf "y\n" | pnpm approve-builds electron', { stdio: 'inherit' })
      } catch (_e) {
        // fallback to simple echo if printf not available
        try {
          execSync('echo y | pnpm approve-builds electron', { stdio: 'inherit' })
        } catch (_e2) {}
      }
    } catch (_) {
      // ignore errors — approval may not be necessary
    }

    // run full install so postinstall scripts run
    // prefer explicit add to trigger electron postinstall reliably
    try {
      execSync(`pnpm add -w electron@${ELECTRON_VERSION}`, { stdio: 'inherit' })
    } catch (_e) {
      // fallback to full install
      execSync('pnpm install', { stdio: 'inherit' })
    }
  } catch (e) {
    console.error('pnpm install failed:', e?.message)
  }

  const foundAfter = checkBinaryPresent()
  if (foundAfter) {
    console.info('Electron binary installed at', foundAfter)
    process.exit(0)
  }

  console.error('\nElectron binary still not found after pnpm install.\n')
  console.error(
    "pnpm appears to have skipped Electron's postinstall/build script. To complete installation using the configured mirror, run the following once:"
  )
  console.error(
    `  export ELECTRON_MIRROR="${mirror}" && export npm_config_electron_mirror="$ELECTRON_MIRROR" && rm -rf node_modules/.pnpm/electron* node_modules/electron* && pnpm add -w electron@${ELECTRON_VERSION} && pnpm approve-builds electron`
  )
  console.error('After that, re-run `pnpm start`.')
  process.exit(1)
} catch (err) {
  console.error('ensure-electron failed:', err?.message)
  process.exit(1)
}
