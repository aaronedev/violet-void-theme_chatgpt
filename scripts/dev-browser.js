const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { chromium } = require('@playwright/test')
const { resolveCachedExtension } = require('./setup-stylus')

const root = path.resolve(__dirname, '..')

function buildLaunchArguments(extensionPath) {
  return [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`
  ]
}

function buildBrowserArguments(config) {
  return [
    `--user-data-dir=${config.profilePath}`,
    ...buildLaunchArguments(config.extensionPath),
    '--no-first-run',
    '--no-default-browser-check',
    localStyleUrl(config.port),
    'https://chatgpt.com'
  ]
}

function localStyleUrl(port) {
  return `http://127.0.0.1:${port}/chatgpt-violet-void.user.css`
}

function resolveConfig(environment = process.env, cachedExtensionResolver = resolveCachedExtension) {
  const port = Number(environment.VIOLET_VOID_PORT || 4173)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('VIOLET_VOID_PORT must be a non-privileged integer between 1024 and 65535.')
  }

  const profilePath = path.resolve(environment.VIOLET_VOID_PROFILE_DIR || path.join(root, '.violet-void-dev-profile'))
  if (!profilePath.startsWith(`${root}${path.sep}`)) {
    throw new Error('VIOLET_VOID_PROFILE_DIR must remain inside this repository to protect your normal browser profile.')
  }
  const browserPath = environment.VIOLET_VOID_BROWSER_PATH ? environment.VIOLET_VOID_BROWSER_PATH : chromium.executablePath()
  if (!path.isAbsolute(browserPath)) {
    throw new Error('VIOLET_VOID_BROWSER_PATH must be an absolute Chromium executable path.')
  }

  return {
    artifactPath: path.join(root, 'chatgpt-violet-void.user.css'),
    browserPath: path.resolve(browserPath),
    extensionPath: environment.STYLUS_EXTENSION_PATH ? path.resolve(environment.STYLUS_EXTENSION_PATH) : cachedExtensionResolver(),
    port,
    profilePath
  }
}

function validateConfig(config) {
  if (!config.extensionPath) {
    throw new Error('Set STYLUS_EXTENSION_PATH to an unpacked Stylus extension directory before launching.')
  }
  if (!fs.statSync(config.extensionPath, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`Stylus extension directory is unavailable: ${config.extensionPath}`)
  }
  if (!fs.statSync(path.join(config.extensionPath, 'manifest.json'), { throwIfNoEntry: false })?.isFile()) {
    throw new Error(`Stylus extension directory has no manifest.json: ${config.extensionPath}`)
  }
  if (!fs.statSync(config.artifactPath, { throwIfNoEntry: false })?.isFile()) {
    throw new Error(`Build the local UserStyle before launching: ${config.artifactPath}`)
  }
  if (!fs.statSync(config.browserPath, { throwIfNoEntry: false })?.isFile()) {
    throw new Error(`Playwright Chromium is unavailable: ${config.browserPath}. Install the Playwright Chromium browser before running dev:browser.`)
  }
}

function serveArtifact(artifactPath, port) {
  const server = http.createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== '/chatgpt-violet-void.user.css') {
      response.writeHead(404)
      response.end('Not found')
      return
    }

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/css; charset=utf-8'
    })
    fs.createReadStream(artifactPath).pipe(response)
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject)
      resolve(server)
    })
  })
}

function waitForBrowser(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code && !signal) {
        reject(new Error(`Chromium exited early with code ${code}.`))
        return
      }
      resolve({ code, signal })
    })
  })
}

function launchBrowser(config, spawnProcess = spawn) {
  return waitForBrowser(spawnProcess(config.browserPath, buildBrowserArguments(config), {
    shell: false,
    stdio: 'inherit',
    windowsHide: false
  }))
}

function printHelp() {
  console.log(`Usage: npm run dev:browser

Optional: STYLUS_EXTENSION_PATH=/absolute/path/to/unpacked/stylus
Optional: VIOLET_VOID_PORT=4173 VIOLET_VOID_PROFILE_DIR=./.violet-void-dev-profile VIOLET_VOID_BROWSER_PATH=/absolute/path/to/chromium

The launcher starts a plain Chromium child process; it is intentionally not Playwright-controlled.
Close any stuck prior QA Chromium window before starting, so the isolated profile is unlocked.
It serves the local UserStyle on 127.0.0.1, then opens its installer URL and chatgpt.com.
Complete Cloudflare, login, and UserStyle confirmation manually. It uses .violet-void-stylus/extension after setup:stylus when no explicit path is set. --dry-run validates paths without launching.`)
}

async function main(cliArgs = process.argv.slice(2), environment = process.env) {
  if (cliArgs.includes('--help') || cliArgs.includes('-h')) {
    printHelp()
    return
  }

  const config = resolveConfig(environment)
  validateConfig(config)

  if (cliArgs.includes('--dry-run')) {
    console.log(JSON.stringify({
      browser: config.browserPath,
      extension: config.extensionPath,
      profile: config.profilePath,
      styleUrl: localStyleUrl(config.port),
      chromiumArguments: buildBrowserArguments(config)
    }, null, 2))
    return
  }

  const server = await serveArtifact(config.artifactPath, config.port)
  try {
    console.log(`Launching plain Chromium with isolated profile: ${config.profilePath}`)
    await launchBrowser(config)
    console.log('Chromium closed; stopping the local UserStyle server.')
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`dev:browser failed: ${error.message}`)
    process.exitCode = 1
  })
}

module.exports = { buildBrowserArguments, buildLaunchArguments, launchBrowser, localStyleUrl, resolveConfig, waitForBrowser }
