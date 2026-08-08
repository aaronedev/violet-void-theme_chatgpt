const assert = require('node:assert/strict')
const test = require('node:test')
const { buildLaunchArguments, localStyleUrl, resolveConfig } = require('../scripts/dev-browser')

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
