const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { cachedStatus, fetchOfficialRelease, resolveCachedExtension, selectChromiumMv3Asset, validateArchiveEntry, validateAssetUrl, verifyAssetBytes } = require('../scripts/setup-stylus')

const bytes = Buffer.from('verified Stylus fixture')
const digest = `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`
const release = {
  tag_name: 'v2.4.9',
  assets: [{
    name: 'stylus-chrome-mv3-v2.4.9-id.zip',
    size: bytes.length,
    digest,
    browser_download_url: 'https://github.com/openstyles/stylus/releases/download/v2.4.9/stylus-chrome-mv3-v2.4.9-id.zip'
  }]
}

test('selects only the official Chromium MV3 release asset', () => {
  assert.equal(selectChromiumMv3Asset(release).name, release.assets[0].name)
  assert.throws(() => selectChromiumMv3Asset({ ...release, assets: [...release.assets, release.assets[0]] }), /exactly one/)
  assert.throws(() => selectChromiumMv3Asset({ ...release, assets: [] }), /exactly one/)
})

test('rejects non-official release URLs and unsafe ZIP paths', () => {
  assert.throws(() => validateAssetUrl('https://example.test/file.zip', 'v2.4.9', release.assets[0].name), /expected OpenStyles/)
  assert.throws(() => validateArchiveEntry('../manifest.json'), /Unsafe archive path/)
  assert.throws(() => validateArchiveEntry('extension\\manifest.json'), /Unsafe archive path/)
})

test('rejects size and SHA-256 mismatches before extraction', () => {
  assert.doesNotThrow(() => verifyAssetBytes(bytes, release.assets[0]))
  assert.throws(() => verifyAssetBytes(Buffer.from('wrong'), release.assets[0]), /size mismatch/)
  assert.throws(() => verifyAssetBytes(bytes, { ...release.assets[0], digest: `sha256:${'0'.repeat(64)}` }), /SHA-256 mismatch/)
})

test('official release lookup is fully mockable', async () => {
  const result = await fetchOfficialRelease(async (url) => ({ ok: true, status: 200, json: async () => release }))
  assert.equal(result.release.tag_name, 'v2.4.9')
  assert.equal(result.asset.name, release.assets[0].name)
})

test('cached extension resolution and freshness checks stay within the supplied cache', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'violet-void-stylus-test-'))
  try {
    await fs.mkdir(path.join(directory, 'extension'))
    await fs.writeFile(path.join(directory, 'extension', 'manifest.json'), '{"manifest_version":3,"name":"Stylus"}')
    await fs.writeFile(path.join(directory, 'release.json'), '{"tag_name":"v2.4.9"}')
    assert.equal(resolveCachedExtension(directory), path.join(directory, 'extension'))
    assert.equal(cachedStatus(release, directory).state, 'current')
    await fs.writeFile(path.join(directory, 'release.json'), '{"tag_name":"v2.4.8"}')
    assert.equal(cachedStatus(release, directory).state, 'outdated')
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
})
