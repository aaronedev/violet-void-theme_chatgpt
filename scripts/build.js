const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const source = path.join(root, 'src', 'chatgpt-violet-void.user.css')
const artifact = path.join(root, 'dist', 'chatgpt-violet-void.user.css')

const versionLinePattern = /^(@version\s+)(\d+)\.(\d+)\.(\d+)([^\n]*)$/m
const plainVersionPattern = /^\d+\.\d+\.\d+$/

function normalize (css) {
  return css.replace(/\r\n/g, '\n')
}

function withTrailingNewline (css) {
  return css.endsWith('\n') ? css : `${css}\n`
}

function headerVersion (css) {
  const match = versionLinePattern.exec(css)
  if (!match) {
    throw new Error('UserStyle header is missing @version')
  }
  return `${match[2]}.${match[3]}.${match[4]}`
}

function setHeaderVersion (css, version) {
  if (!plainVersionPattern.test(version)) {
    throw new Error(`Refusing to write malformed version: ${version}`)
  }
  if (!versionLinePattern.test(css)) {
    throw new Error('UserStyle header is missing @version')
  }
  return css.replace(versionLinePattern, (match, prefix, major, minor, patch, suffix) => `${prefix}${version}${suffix}`)
}

function bumpPatch (version) {
  const parts = version.split('.').map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    throw new Error(`Refusing to bump malformed version: ${version}`)
  }
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`
}

function bodyForComparison (css) {
  return normalize(css).replace(versionLinePattern, '@version')
}

function readManifestVersion (directory) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'))
  const version = manifest && manifest.userStyle && manifest.userStyle.version
  if (!plainVersionPattern.test(version || '')) {
    throw new Error('package.json userStyle.version must be plain semver')
  }
  return version
}

function writeManifestVersion (directory, version) {
  const file = path.join(directory, 'package.json')
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'))
  manifest.userStyle.version = version
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

function build (options = {}) {
  const directory = options.root || root
  const forceBump = options.forceBump === true
  const noBump = options.noBump === true
  const sourceFile = path.join(directory, 'src', 'chatgpt-violet-void.user.css')
  const artifactFile = path.join(directory, 'dist', 'chatgpt-violet-void.user.css')

  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Canonical UserStyle is missing: ${sourceFile}`)
  }

  let css = normalize(fs.readFileSync(sourceFile, 'utf8'))
  const manifestVersion = readManifestVersion(directory)
  const sourceVersion = headerVersion(css)
  let version = sourceVersion
  let bumped = false

  if (!noBump && manifestVersion !== sourceVersion) {
    css = setHeaderVersion(css, manifestVersion)
    version = manifestVersion
    fs.writeFileSync(sourceFile, withTrailingNewline(css), 'utf8')
    console.log(`Synced UserStyle header to package.json version ${version}`)
  } else if (!noBump && (forceBump || (fs.existsSync(artifactFile) && bodyForComparison(fs.readFileSync(artifactFile, 'utf8')) !== bodyForComparison(css)))) {
    version = bumpPatch(sourceVersion)
    css = setHeaderVersion(css, version)
    fs.writeFileSync(sourceFile, withTrailingNewline(css), 'utf8')
    writeManifestVersion(directory, version)
    bumped = true
    console.log(`Bumped UserStyle patch version ${sourceVersion} to ${version}`)
  }

  fs.mkdirSync(path.dirname(artifactFile), { recursive: true })
  fs.writeFileSync(artifactFile, withTrailingNewline(css), 'utf8')
  return { version, bumped }
}

if (require.main === module) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node scripts/build.js [--bump] [--no-bump]\n\nBumps the patch version in the src header, package.json, and dist only when the CSS changed since the last build. A manual package.json version always wins and is synced into the header without an extra bump.\n\n--bump     force a patch bump even when the CSS is unchanged\n--no-bump  copy src to dist without touching any version')
  } else {
    const result = build({ forceBump: args.includes('--bump'), noBump: args.includes('--no-bump') })
    console.log(`Built ${path.relative(root, artifact)} from ${path.relative(root, source)} (version ${result.version}${result.bumped ? ', bumped' : ', unchanged'})`)
  }
}

module.exports = { bodyForComparison, build, bumpPatch, headerVersion, setHeaderVersion }
