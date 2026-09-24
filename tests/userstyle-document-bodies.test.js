const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const { userStyleBodiesForHostname } = require('./userstyle-document-bodies')

const root = path.resolve(__dirname, '..')
const sourcePath = path.join(root, 'src/chatgpt-violet-void.user.css')
const artifactPath = path.join(root, 'dist/chatgpt-violet-void.user.css')

for (const stylesheetPath of [sourcePath, artifactPath]) {
  const name = path.relative(root, stylesheetPath)
  for (const host of ['chatgpt.com', 'chat.openai.com']) {
    test(`${name}: exact app origin ${host} loads actual theme rules`, () => {
      const css = userStyleBodiesForHostname(host, stylesheetPath)
      assert.ok(css.includes('--void-bg: #0f0f0f;'))
      assert.ok(css.includes('#prompt-textarea'))
      assert.ok(!css.includes('Learn dark-scale bridge'))
    })
  }

  test(`${name}: Learn receives only its independent theme`, () => {
    const css = userStyleBodiesForHostname('learn.chatgpt.com', stylesheetPath)
    assert.ok(css.includes('Learn dark-scale bridge'))
    assert.ok(!css.includes('--void-bg:'))
    assert.ok(!css.includes('#prompt-textarea'))
  })

  test(`${name}: app rules do not leak into other or lookalike hosts`, () => {
    for (const host of ['example.com', 'other.chatgpt.com', 'chatgpt.com.example.com', 'notchatgpt.com', 'chat.openai.com.example.com']) {
      assert.equal(userStyleBodiesForHostname(host, stylesheetPath), '', host)
    }
  })
}

test('the shipped source, artifact and release metadata stay synchronized', () => {
  const source = fs.readFileSync(sourcePath, 'utf8')
  const artifact = fs.readFileSync(artifactPath, 'utf8')
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  assert.equal(artifact, source)
  assert.equal(/^@version\s+(\S+)/m.exec(artifact)[1], manifest.userStyle.version)
  assert.match(artifact, /^@namespace\s+github\.com\/aaronedev\/violet-void-theme$/m)
  assert.match(artifact, /^@updateURL\s+https:\/\/raw\.githubusercontent\.com\/aaronedev\/violet-void-theme_chatgpt\/main\/dist\/chatgpt-violet-void\.user\.css$/m)
  assert.ok(!manifest.scripts.check.includes('npm run build'), 'check must detect stale artifacts without rebuilding them')
})
