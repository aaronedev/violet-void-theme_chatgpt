const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const source = path.join(root, 'src', 'chatgpt-violet-void.user.css')
const artifact = path.join(root, 'chatgpt-violet-void.user.css')
const canonical = fs.readFileSync(source, 'utf8').replace(/\r\n/g, '\n').replace(/\n?$/, '\n')
const built = fs.readFileSync(artifact, 'utf8')

if (built !== canonical) {
  throw new Error('Root UserStyle does not exactly match the canonical source.')
}

const requiredMetadata = [
  '@version        5.4.1',
  '@updateURL      https://raw.githubusercontent.com/aaronedev/violet-void-theme/main/chatgpt-violet-void.user.css',
  '@downloadURL    https://raw.githubusercontent.com/aaronedev/violet-void-theme/main/chatgpt-violet-void.user.css'
]

for (const value of requiredMetadata) {
  if (!built.includes(value)) {
    throw new Error(`Root UserStyle is missing required metadata: ${value}`)
  }
}

console.log('Verified canonical source and root artifact are byte-identical.')
