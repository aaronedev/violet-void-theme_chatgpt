const assert = require('node:assert/strict')
const test = require('node:test')
const { buildBrowserArguments, buildLaunchArguments, localStyleUrl, resolveConfig } = require('../scripts/dev-browser')

test('dev browser Chromium arguments load only the supplied unpacked extension', () => {
  const extension = '/tmp/unpacked-stylus'
  assert.deepEqual(buildLaunchArguments(extension), [
    '--disable-extensions-except=/tmp/unpacked-stylus',
    '--load-extension=/tmp/unpacked-stylus'
  ])
})

test('dev browser configuration binds the local UserStyle to loopback', () => {
  const config = resolveConfig({ VIOLET_VOID_PORT: '4812' })
  assert.equal(config.port, 4812)
  assert.equal(localStyleUrl(config.port), 'http://127.0.0.1:4812/chatgpt-violet-void.user.css')
})

test('dev browser resolves the verified cache when no explicit extension path is set', () => {
  const config = resolveConfig({}, () => '/tmp/verified-stylus-cache/extension')
  assert.equal(config.extensionPath, '/tmp/verified-stylus-cache/extension')
})

test('manual QA arguments use only the isolated profile, extension, and start pages', () => {
  const argumentsList = buildBrowserArguments({
    extensionPath: '/tmp/verified-stylus-cache/extension',
    profilePath: '/repo/.violet-void-dev-profile',
    port: 4812
  })
  assert.deepEqual(argumentsList, [
    '--user-data-dir=/repo/.violet-void-dev-profile',
    '--disable-extensions-except=/tmp/verified-stylus-cache/extension',
    '--load-extension=/tmp/verified-stylus-cache/extension',
    '--no-first-run',
    '--no-default-browser-check',
    'http://127.0.0.1:4812/chatgpt-violet-void.user.css',
    'https://chatgpt.com'
  ])
  assert.equal(argumentsList.some((value) => /automation|remote-debugging|webdriver/i.test(value)), false)
})

test('dev browser accepts only an absolute Chromium override', () => {
  const config = resolveConfig({ VIOLET_VOID_BROWSER_PATH: '/opt/chromium', VIOLET_VOID_PORT: '4812' })
  assert.equal(config.browserPath, '/opt/chromium')
  assert.throws(() => resolveConfig({ VIOLET_VOID_BROWSER_PATH: 'chromium' }), /absolute Chromium/)
})
