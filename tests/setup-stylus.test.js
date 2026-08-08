const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { cachedStatus, fetchOfficialRelease, resolveCachedExtension, selectChromiumMv3Asset, validateArchiveEntry, validateAssetUrl, validateExtensionManifest, verifyAssetBytes } = require('../scripts/setup-stylus')

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

async function writeCurrentCache(directory, asset = release.assets[0]) {
  await fs.mkdir(path.join(directory, 'extension'), { recursive: true })
  await fs.writeFile(path.join(directory, 'extension', 'manifest.json'), '{"manifest_version":3,"name":"Stylus"}')
  await fs.writeFile(path.join(directory, 'archive.zip'), bytes)
  await fs.writeFile(path.join(directory, 'release.json'), JSON.stringify({
    tag_name: release.tag_name,
    asset_name: asset.name,
    asset_size: asset.size,
    asset_digest: asset.digest
  }))
}

test('cache freshness requires matching MV3 manifest, metadata, and verified archive', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'violet-void-stylus-test-'))
  try {
    await writeCurrentCache(directory)
    assert.equal(resolveCachedExtension(directory), path.join(directory, 'extension'))
    assert.equal(cachedStatus(release, release.assets[0], directory).state, 'current')
    const sameTagReplacement = { ...release.assets[0], digest: `sha256:${'0'.repeat(64)}` }
    assert.equal(cachedStatus(release, sameTagReplacement, directory).state, 'outdated')
    await fs.writeFile(path.join(directory, 'release.json'), '{bad json')
    assert.notEqual(cachedStatus(release, release.assets[0], directory).state, 'current')
    await writeCurrentCache(directory)
    await fs.writeFile(path.join(directory, 'archive.zip'), 'corrupted')
    assert.equal(cachedStatus(release, release.assets[0], directory).state, 'corrupt')
    await fs.writeFile(path.join(directory, 'archive.zip'), bytes)
    await fs.writeFile(path.join(directory, 'release.json'), JSON.stringify({ tag_name: release.tag_name, asset_name: 'replacement.zip', asset_size: bytes.length, asset_digest: digest }))
    assert.equal(cachedStatus(release, release.assets[0], directory).state, 'outdated')
    await writeCurrentCache(directory)
    await fs.rm(path.join(directory, 'archive.zip'))
    assert.equal(cachedStatus(release, release.assets[0], directory).state, 'corrupt')
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
})

test('an MV2 manifest is rejected before cache activation', () => {
  assert.throws(() => validateExtensionManifest({ manifest_version: 2, name: 'Stylus' }), /MV3/)
  assert.doesNotThrow(() => validateExtensionManifest({ manifest_version: 3, name: 'Stylus' }))
})
