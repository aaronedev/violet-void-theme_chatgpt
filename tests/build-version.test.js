const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { bodyForComparison, build, bumpPatch, headerVersion, setHeaderVersion } = require('../scripts/build')

function fixture (version = '5.4.6') {
  return `/* ==UserStyle==\n@name           ChatGPT Violet Void\n@version        ${version}\n==/UserStyle== */\n\n@-moz-document domain("chatgpt.com") {\n  a {\n    color: red !important;\n  }\n}\n`
}

function sandbox () {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'violet-void-build-'))
  fs.mkdirSync(path.join(directory, 'src'), { recursive: true })
  fs.mkdirSync(path.join(directory, 'dist'), { recursive: true })
  fs.writeFileSync(path.join(directory, 'src', 'chatgpt-violet-void.user.css'), fixture(), 'utf8')
  fs.writeFileSync(path.join(directory, 'dist', 'chatgpt-violet-void.user.css'), fixture(), 'utf8')
  fs.writeFileSync(path.join(directory, 'package.json'), `${JSON.stringify({ userStyle: { version: '5.4.6' } }, null, 2)}\n`, 'utf8')
  return directory
}

function readTree (directory) {
  return {
    src: fs.readFileSync(path.join(directory, 'src', 'chatgpt-violet-void.user.css'), 'utf8'),
    dist: fs.readFileSync(path.join(directory, 'dist', 'chatgpt-violet-void.user.css'), 'utf8'),
    manifest: JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'))
  }
}

test('unchanged rebuild bumps nothing and stays byte-identical', () => {
  const directory = sandbox()
  const result = build({ root: directory })
  assert.equal(result.bumped, false)
  assert.equal(result.version, '5.4.6')
  const tree = readTree(directory)
  assert.equal(tree.src, tree.dist)
  assert.equal(tree.manifest.userStyle.version, '5.4.6')
})

test('changed CSS bumps the patch version in src, manifest, and dist', () => {
  const directory = sandbox()
  fs.writeFileSync(path.join(directory, 'src', 'chatgpt-violet-void.user.css'), `${fixture()}/* tweak */\n`, 'utf8')
  const result = build({ root: directory })
  assert.equal(result.bumped, true)
  assert.equal(result.version, '5.4.7')
  const tree = readTree(directory)
  assert.equal(headerVersion(tree.src), '5.4.7')
  assert.equal(tree.manifest.userStyle.version, '5.4.7')
  assert.equal(tree.src, tree.dist)
})

test('a manual package.json version wins without an extra bump', () => {
  const directory = sandbox()
  fs.writeFileSync(path.join(directory, 'package.json'), `${JSON.stringify({ userStyle: { version: '5.5.0' } }, null, 2)}\n`, 'utf8')
  const result = build({ root: directory })
  assert.equal(result.bumped, false)
  assert.equal(result.version, '5.5.0')
  const tree = readTree(directory)
  assert.equal(headerVersion(tree.src), '5.5.0')
  assert.equal(tree.src, tree.dist)
})

test('forced bump increments an unchanged tree', () => {
  const directory = sandbox()
  const result = build({ root: directory, forceBump: true })
  assert.equal(result.bumped, true)
  assert.equal(result.version, '5.4.7')
  const tree = readTree(directory)
  assert.equal(tree.src, tree.dist)
})

test('no-bump copies without touching versions', () => {
  const directory = sandbox()
  fs.writeFileSync(path.join(directory, 'src', 'chatgpt-violet-void.user.css'), `${fixture()}/* tweak */\n`, 'utf8')
  const result = build({ root: directory, noBump: true })
  assert.equal(result.bumped, false)
  assert.equal(result.version, '5.4.6')
  const tree = readTree(directory)
  assert.equal(tree.src, tree.dist)
  assert.equal(tree.manifest.userStyle.version, '5.4.6')
})

test('version-line differences alone do not count as a CSS change', () => {
  assert.equal(bodyForComparison(fixture('5.4.6')), bodyForComparison(fixture('5.4.9')))
})

test('malformed versions are rejected', () => {
  assert.throws(() => bumpPatch('5.4'), /malformed/)
  assert.throws(() => headerVersion('no header here'), /@version/)
  assert.throws(() => setHeaderVersion('no header here', '5.4.7'), /@version/)
})
