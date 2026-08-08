const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const source = path.join(root, 'src', 'chatgpt-violet-void.user.css')
const artifact = path.join(root, 'dist', 'chatgpt-violet-void.user.css')

if (!fs.existsSync(source)) {
  throw new Error(`Canonical UserStyle is missing: ${source}`)
}

const css = fs.readFileSync(source, 'utf8').replace(/\r\n/g, '\n')
fs.mkdirSync(path.dirname(artifact), { recursive: true })
fs.writeFileSync(artifact, css.endsWith('\n') ? css : `${css}\n`, 'utf8')
console.log(`Built ${path.relative(root, artifact)} from ${path.relative(root, source)}`)
