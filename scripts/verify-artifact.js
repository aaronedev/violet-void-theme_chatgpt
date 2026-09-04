const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const source = path.join(root, 'src', 'chatgpt-violet-void.user.css')
const artifact = path.join(root, 'dist', 'chatgpt-violet-void.user.css')
const legacyArtifact = path.join(root, 'chatgpt-violet-void.user.css')
const canonical = fs.readFileSync(source, 'utf8').replace(/\r\n/g, '\n').replace(/\n?$/, '\n')
const built = fs.readFileSync(artifact, 'utf8')

if (built !== canonical) {
  throw new Error('Dist UserStyle does not exactly match the canonical source.')
}

if (fs.existsSync(legacyArtifact)) {
  throw new Error('Legacy root UserStyle artifact must be absent.')
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const expectedVersion = manifest && manifest.userStyle && manifest.userStyle.version
if (!/^\d+\.\d+\.\d+$/.test(expectedVersion || '')) {
  throw new Error('package.json userStyle.version must be plain semver')
}

if (!new RegExp(`@version\\s+${expectedVersion.replace(/\./g, '\\.')}(?!\\d)`).test(built)) {
  throw new Error(`Dist UserStyle is missing required metadata: @version ${expectedVersion}`)
}

const requiredMetadata = [
  '@updateURL      https://raw.githubusercontent.com/aaronedev/violet-void-theme_chatgpt/main/dist/chatgpt-violet-void.user.css',
  '@downloadURL    https://raw.githubusercontent.com/aaronedev/violet-void-theme_chatgpt/main/dist/chatgpt-violet-void.user.css'
]

for (const value of requiredMetadata) {
  if (!built.includes(value)) {
    throw new Error(`Dist UserStyle is missing required metadata: ${value}`)
  }
}

console.log('Verified canonical source and dist artifact are byte-identical; legacy root artifact is absent.')
