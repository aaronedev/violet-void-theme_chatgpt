const assert = require('node:assert/strict')
const path = require('node:path')
const test = require('node:test')
const { buildWebExtArguments, localStyleUrl, resolveConfig } = require('../scripts/dev-browser')

test('dev browser configuration binds the local UserStyle to loopback and Firefox', () => {
  const config = resolveConfig({ VIOLET_VOID_PORT: '4812', VIOLET_VOID_FIREFOX_PATH: '/opt/firefox' }, () => '/tmp/verified-stylus-cache/extension', () => '/repo/node_modules/web-ext/bin/web-ext.js')
  assert.equal(config.port, 4812)
  assert.equal(config.artifactPath, path.resolve(__dirname, '../dist/chatgpt-violet-void.user.css'))
  assert.equal(config.browserPath, '/opt/firefox')
  assert.equal(config.profilePath, path.resolve(__dirname, '../.violet-void-firefox-profile'))
  assert.equal(config.webExtPath, '/repo/node_modules/web-ext/bin/web-ext.js')
  assert.equal(localStyleUrl(config.port), 'http://127.0.0.1:4812/chatgpt-violet-void.user.css')
})

test('dev browser resolves the verified cache when no explicit extension path is set', () => {
  const config = resolveConfig({}, () => '/tmp/verified-stylus-cache/extension')
  assert.equal(config.extensionPath, '/tmp/verified-stylus-cache/extension')
})

test('manual QA uses Firefox web-ext with only the isolated profile and approved start pages', () => {
  const argumentsList = buildWebExtArguments({
    browserPath: '/usr/bin/firefox',
    extensionPath: '/tmp/verified-stylus-cache/extension',
    profilePath: '/repo/.violet-void-firefox-profile',
    port: 4812
  })
  assert.deepEqual(argumentsList, [
    'run',
    '--source-dir', '/tmp/verified-stylus-cache/extension',
    '--target', 'firefox-desktop',
    '--firefox', '/usr/bin/firefox',
    '--firefox-profile', '/repo/.violet-void-firefox-profile',
    '--profile-create-if-missing',
    '--keep-profile-changes',
    '--no-reload',
    '--start-url',
    'http://127.0.0.1:4812/chatgpt-violet-void.user.css',
    '--start-url',
    'https://chatgpt.com',
    '--start-url',
    'https://learn.chatgpt.com/use-cases/refactor-your-codebase#introduction'
  ])
  assert.equal(argumentsList.some((value) => /automation|remote-debugging|webdriver/i.test(value)), false)
})

test('dev browser accepts only an absolute Firefox override', () => {
  const config = resolveConfig({ VIOLET_VOID_FIREFOX_PATH: '/opt/firefox', VIOLET_VOID_PORT: '4812' }, () => '/tmp/verified-stylus-cache/extension', () => '/repo/node_modules/web-ext/bin/web-ext.js')
  assert.equal(config.browserPath, '/opt/firefox')
  assert.throws(() => resolveConfig({ VIOLET_VOID_FIREFOX_PATH: 'firefox' }, () => '/tmp/verified-stylus-cache/extension', () => '/repo/node_modules/web-ext/bin/web-ext.js'), /absolute Firefox/)
})
