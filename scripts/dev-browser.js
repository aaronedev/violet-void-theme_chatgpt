const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { chromium } = require('@playwright/test')

const root = path.resolve(__dirname, '..')

function buildLaunchArguments(extensionPath) {
  return [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`
  ]
}

function localStyleUrl(port) {
  return `http://127.0.0.1:${port}/chatgpt-violet-void.user.css`
}

function resolveConfig(environment = process.env) {
  const port = Number(environment.VIOLET_VOID_PORT || 4173)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('VIOLET_VOID_PORT must be a non-privileged integer between 1024 and 65535.')
  }

  return {
    artifactPath: path.join(root, 'chatgpt-violet-void.user.css'),
    browserPath: chromium.executablePath(),
    extensionPath: environment.STYLUS_EXTENSION_PATH ? path.resolve(environment.STYLUS_EXTENSION_PATH) : null,
    port,
    profilePath: path.resolve(environment.VIOLET_VOID_PROFILE_DIR || path.join(root, '.violet-void-dev-profile'))
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

function printHelp() {
  console.log(`Usage: npm run dev:browser

Required: STYLUS_EXTENSION_PATH=/absolute/path/to/unpacked/stylus
Optional: VIOLET_VOID_PORT=4173 VIOLET_VOID_PROFILE_DIR=./.violet-void-dev-profile

The launcher uses Playwright's bundled Chromium and only the isolated profile above.
It serves the local UserStyle on 127.0.0.1, then opens its installer URL and chatgpt.com.
Install/update the style and sign in manually. --dry-run validates paths without launching.`)
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
      chromiumArguments: buildLaunchArguments(config.extensionPath)
    }, null, 2))
    return
  }

  const server = await serveArtifact(config.artifactPath, config.port)
  let context
  const shutdown = async () => {
    await context?.close()
    await new Promise((resolve) => server.close(resolve))
  }

  try {
    context = await chromium.launchPersistentContext(config.profilePath, {
      channel: 'chromium',
      headless: false,
      args: buildLaunchArguments(config.extensionPath)
    })
    await (await context.newPage()).goto(localStyleUrl(config.port))
    await (await context.newPage()).goto('https://chatgpt.com')
    console.log(`Manual QA browser is open with isolated profile: ${config.profilePath}`)
    console.log('Install/update the local UserStyle and sign in manually; closing Chromium stops the local server.')
    await new Promise((resolve) => context.once('close', resolve))
  } finally {
    await shutdown()
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`dev:browser failed: ${error.message}`)
    process.exitCode = 1
  })
}

module.exports = { buildLaunchArguments, localStyleUrl, resolveConfig }
