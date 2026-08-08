const crypto = require('node:crypto')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const { pipeline } = require('node:stream/promises')
const yauzl = require('yauzl')

const root = path.resolve(__dirname, '..')
const cacheDir = path.join(root, '.violet-void-stylus')
const releaseApiUrl = 'https://api.github.com/repos/openstyles/stylus/releases/latest'

function validateDigest(digest) {
  const match = /^sha256:([a-f0-9]{64})$/.exec(digest || '')
  if (!match) throw new Error('Official release asset is missing a sha256 digest.')
  return match[1]
}

function selectChromiumMv3Asset(release) {
  if (!release || typeof release.tag_name !== 'string') throw new Error('Official release has no tag_name.')
  const expectedName = `stylus-chrome-mv3-${release.tag_name}-id.zip`
  const matches = (release.assets || []).filter((asset) => asset?.name === expectedName)
  if (matches.length !== 1) throw new Error(`Expected exactly one Chromium MV3 asset named ${expectedName}.`)
  const asset = matches[0]
  if (!Number.isSafeInteger(asset.size) || asset.size <= 0) throw new Error('Official release asset has an invalid size.')
  validateDigest(asset.digest)
  validateAssetUrl(asset.browser_download_url, release.tag_name, asset.name)
  return asset
}

function validateAssetUrl(value, tag, name) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('Official release asset has an invalid download URL.')
  }
  const expectedPath = `/openstyles/stylus/releases/download/${tag}/${name}`
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.pathname !== expectedPath) {
    throw new Error('Official release asset URL is not the expected OpenStyles GitHub release download URL.')
  }
  return url
}

function trustedDownloadHost(hostname) {
  return hostname === 'github.com' || hostname.endsWith('.githubusercontent.com')
}

async function fetchOfficialRelease(fetcher = fetch) {
  const response = await fetcher(releaseApiUrl, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'violet-void-theme-setup' }
  })
  if (!response.ok) throw new Error(`Official release lookup failed: HTTP ${response.status}.`)
  const release = await response.json()
  return { release, asset: selectChromiumMv3Asset(release) }
}

async function downloadAsset(asset, tag, fetcher = fetch) {
  let url = validateAssetUrl(asset.browser_download_url, tag, asset.name)
  for (let redirects = 0; redirects < 6; redirects += 1) {
    const response = await fetcher(url, { redirect: 'manual', headers: { 'User-Agent': 'violet-void-theme-setup' } })
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location')
      if (!location) throw new Error('Official asset redirect has no location.')
      url = new URL(location, url)
      if (url.protocol !== 'https:' || !trustedDownloadHost(url.hostname)) throw new Error('Official asset redirect left GitHub-controlled hosts.')
      continue
    }
    if (!response.ok) throw new Error(`Official asset download failed: HTTP ${response.status}.`)
    return Buffer.from(await response.arrayBuffer())
  }
  throw new Error('Official asset exceeded the redirect limit.')
}

function verifyAssetBytes(bytes, asset) {
  if (bytes.length !== asset.size) throw new Error(`Downloaded asset size mismatch: expected ${asset.size}, received ${bytes.length}.`)
  const actual = crypto.createHash('sha256').update(bytes).digest('hex')
  if (actual !== validateDigest(asset.digest)) throw new Error('Downloaded asset SHA-256 mismatch.')
}

function validateArchiveEntry(entryName) {
  if (!entryName || entryName.includes('\\') || entryName.startsWith('/') || entryName.split('/').includes('..')) {
    throw new Error(`Unsafe archive path: ${entryName}`)
  }
}

async function extractZip(archivePath, destination) {
  await fsp.mkdir(destination, { recursive: true })
  await new Promise((resolve, reject) => {
    yauzl.open(archivePath, { lazyEntries: true, autoClose: true }, (openError, zip) => {
      if (openError) return reject(openError)
      zip.readEntry()
      zip.on('entry', (entry) => {
        try {
          validateArchiveEntry(entry.fileName)
          const type = (entry.externalFileAttributes >>> 16) & 0o170000
          if (type && type !== 0o100000 && type !== 0o040000) throw new Error(`Unsupported archive entry type: ${entry.fileName}`)
          const target = path.resolve(destination, entry.fileName)
          if (!target.startsWith(`${destination}${path.sep}`) && target !== destination) throw new Error(`Unsafe archive path: ${entry.fileName}`)
          if (entry.fileName.endsWith('/')) {
            fsp.mkdir(target, { recursive: true }).then(() => zip.readEntry(), reject)
            return
          }
          zip.openReadStream(entry, (streamError, stream) => {
            if (streamError) return reject(streamError)
            fsp.mkdir(path.dirname(target), { recursive: true })
              .then(() => pipeline(stream, fs.createWriteStream(target)))
              .then(() => zip.readEntry(), reject)
          })
        } catch (error) {
          reject(error)
        }
      })
      zip.once('end', resolve)
      zip.once('error', reject)
    })
  })
  const manifestPath = path.join(destination, 'manifest.json')
  const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'))
  if (!manifest.manifest_version || !manifest.name) throw new Error('Extracted extension manifest is invalid.')
}

function resolveCachedExtension(directory = cacheDir) {
  const extension = path.join(directory, 'extension')
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'))
    return manifest.manifest_version === 3 ? extension : null
  } catch {
    return null
  }
}

function cachedStatus(release, directory = cacheDir) {
  const extension = resolveCachedExtension(directory)
  if (!extension) return { state: 'missing', extension: null }
  try {
    const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'release.json'), 'utf8'))
    return { state: metadata.tag_name === release.tag_name ? 'current' : 'outdated', extension, cachedTag: metadata.tag_name }
  } catch {
    return { state: 'outdated', extension, cachedTag: null }
  }
}

async function installRelease(release, asset, directory = cacheDir, fetcher = fetch) {
  const bytes = await downloadAsset(asset, release.tag_name, fetcher)
  verifyAssetBytes(bytes, asset)
  await fsp.mkdir(directory, { recursive: true })
  const staging = path.join(directory, `.staging-${process.pid}-${Date.now()}`)
  const archive = path.join(staging, 'archive.zip')
  const extracted = path.join(staging, 'extension')
  try {
    await fsp.mkdir(staging)
    await fsp.writeFile(archive, bytes)
    await extractZip(archive, extracted)
    for (const child of ['archive.zip', 'extension', 'release.json']) await fsp.rm(path.join(directory, child), { recursive: true, force: true })
    await fsp.rename(archive, path.join(directory, 'archive.zip'))
    await fsp.rename(extracted, path.join(directory, 'extension'))
    await fsp.writeFile(path.join(directory, 'release.json'), `${JSON.stringify({ tag_name: release.tag_name, asset: asset.name, digest: asset.digest }, null, 2)}\n`)
  } finally {
    await fsp.rm(staging, { recursive: true, force: true })
  }
}

function printHelp() {
  console.log('Usage: npm run setup:stylus [--help|--dry-run|--check]\n\n--dry-run fetches and reports the official latest release without downloading.\n--check exits 0 when the verified cache matches latest, or 2 when it is missing/outdated.\nDefault downloads, verifies, and unpacks only the official Chromium MV3 asset into .violet-void-stylus/.')
}

async function main(args = process.argv.slice(2), fetcher = fetch) {
  if (args.includes('--help') || args.includes('-h')) return printHelp()
  const { release, asset } = await fetchOfficialRelease(fetcher)
  if (args.includes('--dry-run')) return console.log(`${release.tag_name}: ${asset.name} (${asset.size} bytes)`)
  if (args.includes('--check')) {
    const status = cachedStatus(release)
    console.log(`${status.state}: latest=${release.tag_name}${status.cachedTag ? ` cached=${status.cachedTag}` : ''}`)
    if (status.state !== 'current') process.exitCode = 2
    return status
  }
  await installRelease(release, asset, cacheDir, fetcher)
  console.log(`Installed ${release.tag_name} Chromium MV3 extension in ${cacheDir}`)
}

if (require.main === module) main().catch((error) => { console.error(`setup:stylus failed: ${error.message}`); process.exitCode = 1 })

module.exports = { cachedStatus, downloadAsset, fetchOfficialRelease, installRelease, localCacheDir: cacheDir, resolveCachedExtension, selectChromiumMv3Asset, validateArchiveEntry, validateAssetUrl, validateDigest, verifyAssetBytes }
