const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { spawn } = require('node:child_process')

const { resolveCachedExtension } = require('./setup-stylus')

const root = path.resolve(__dirname, '..')
const startUrls = [
  'https://chatgpt.com',
  'https://learn.chatgpt.com/use-cases/refactor-your-codebase#introduction'
]

function localStyleUrl(port) {
  return `http://127.0.0.1:${port}/chatgpt-violet-void.user.css`
}

function resolveWebExtCli() {
  return path.join(path.dirname(require.resolve('web-ext')), 'bin', 'web-ext.js')
}

function resolveFirefoxPath(environment = process.env, pathExists = fs.existsSync) {
  const configured = environment.VIOLET_VOID_FIREFOX_PATH
  if (configured) {
    if (!path.isAbsolute(configured)) {
      throw new Error('VIOLET_VOID_FIREFOX_PATH must be an absolute Firefox executable path.')
    }
    return path.resolve(configured)
  }

  const defaultPath = ['/usr/bin/firefox', '/usr/bin/firefox-developer-edition'].find(pathExists)
  if (!defaultPath) {
    throw new Error('Firefox is unavailable. Set VIOLET_VOID_FIREFOX_PATH to an absolute Firefox executable path.')
  }
  return defaultPath
}

function resolveConfig(
  environment = process.env,
  cachedExtensionResolver = resolveCachedExtension,
  webExtResolver = resolveWebExtCli,
  firefoxResolver = resolveFirefoxPath
) {
  const port = Number(environment.VIOLET_VOID_PORT || 4173)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('VIOLET_VOID_PORT must be a non-privileged integer between 1024 and 65535.')
  }

  const profilePath = path.resolve(
    environment.VIOLET_VOID_PROFILE_DIR || path.join(root, '.violet-void-firefox-profile')
  )
  if (!profilePath.startsWith(`${root}${path.sep}`)) {
    throw new Error('VIOLET_VOID_PROFILE_DIR must remain inside this repository to protect your normal Firefox profile.')
  }

  return {
    artifactPath: path.join(root, 'dist', 'chatgpt-violet-void.user.css'),
    browserPath: firefoxResolver(environment),
    extensionPath: environment.STYLUS_EXTENSION_PATH
      ? path.resolve(environment.STYLUS_EXTENSION_PATH)
      : cachedExtensionResolver(),
    port,
    profilePath,
    webExtPath: webExtResolver()
  }
}

function buildWebExtArguments(config) {
  return [
    'run',
    '--source-dir', config.extensionPath,
    '--target', 'firefox-desktop',
    '--firefox', config.browserPath,
    '--firefox-profile', config.profilePath,
    '--profile-create-if-missing',
    '--keep-profile-changes',
    '--no-reload',
    '--start-url', localStyleUrl(config.port),
    '--start-url', startUrls[0],
    '--start-url', startUrls[1]
  ]
}

function validateConfig(config) {
  if (!config.extensionPath) {
    throw new Error('Set STYLUS_EXTENSION_PATH to an unpacked Stylus Firefox extension directory before launching.')
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
    throw new Error(`Firefox is unavailable: ${config.browserPath}`)
  }
  if (!fs.statSync(config.webExtPath, { throwIfNoEntry: false })?.isFile()) {
    throw new Error(`Local web-ext CLI is unavailable: ${config.webExtPath}. Run npm install before dev:browser.`)
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

function waitForWebExt(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code && !signal) {
        reject(new Error(`web-ext exited early with code ${code}.`))
        return
      }
      resolve({ code, signal })
    })
  })
}

function launchBrowser(config, spawnProcess = spawn) {
  return waitForWebExt(spawnProcess(process.execPath, [config.webExtPath, ...buildWebExtArguments(config)], {
    cwd: root,
    shell: false,
    stdio: 'inherit',
    windowsHide: false
  }))
}

function printHelp() {
  console.log(`Usage: npm run dev:browser

Optional: STYLUS_EXTENSION_PATH=/absolute/path/to/unpacked/stylus
Optional: VIOLET_VOID_PORT=4173 VIOLET_VOID_PROFILE_DIR=./.violet-void-firefox-profile
Optional: VIOLET_VOID_FIREFOX_PATH=/absolute/path/to/firefox

The launcher runs local web-ext with Firefox and an isolated QA profile. web-ext makes that profile
unsuitable for daily browsing. It serves the local UserStyle on 127.0.0.1, then opens its installer
URL, chatgpt.com, and the Learn refactor use case. Complete Cloudflare, login, and UserStyle
confirmation manually. CAPTCHA handling and credentials are never automated. It uses
.violet-void-stylus/extension after setup:stylus when no explicit path is set. --dry-run validates
paths without launching.`)
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
      firefox: config.browserPath,
      profile: config.profilePath,
      styleUrl: localStyleUrl(config.port),
      webExt: config.webExtPath,
      webExtArguments: buildWebExtArguments(config)
    }, null, 2))
    return
  }

  const server = await serveArtifact(config.artifactPath, config.port)
  try {
    console.log(`Launching Firefox through web-ext with isolated profile: ${config.profilePath}`)
    await launchBrowser(config)
    console.log('Firefox closed; stopping the local UserStyle server.')
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

module.exports = {
  buildWebExtArguments,
  launchBrowser,
  localStyleUrl,
  resolveConfig,
  resolveFirefoxPath,
  resolveWebExtCli,
  waitForWebExt
}
