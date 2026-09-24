const path = require('node:path')
const { expect, test } = require('@playwright/test')
const { userStyleBodiesForHostname } = require('./userstyle-document-bodies')

// Exercise what Stylus installs, not just the authored source. These are
// synthetic compatibility fixtures, not a captured authenticated ChatGPT DOM.
const artifactPath = path.resolve(__dirname, '../dist/chatgpt-violet-void.user.css')

function fixture(htmlAttributes = '', bodyAttributes = '') {
  return `<!doctype html><html ${htmlAttributes}><head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Violet Void theme activation fixture</title>
    <style>
      ${userStyleBodiesForHostname('chatgpt.com', artifactPath)}
      html, body, #root, main { background: rgb(250, 251, 252); color: rgb(20, 21, 22); margin: 0; }
      body, #root { --bg-primary: #202123; --bg-secondary: #303134; --text-primary: #eeeeee; }
      main { padding: 16px; }
      .native-width { width: min(640px, 100%); max-width: 640px; }
      #token-primary { background: var(--bg-primary); color: var(--text-primary); }
      #token-secondary { background: var(--bg-secondary); }
      #prompt-textarea { min-height: 48px; padding: 12px; }
      [data-composer-surface] { background: rgb(230, 231, 232); }
      #nested-dark { padding: 8px; }
    </style></head><body ${bodyAttributes}><div id="root"><main>
      <h1>Theme compatibility</h1>
      <div class="native-width" id="native-width">
        <p id="token-primary">Primary surface</p><p id="token-secondary">Secondary surface</p>
        <article data-message-author-role="assistant"><div class="markdown"><p>Native layout and syntax colors stay in charge.</p><pre><code>const violetVoid = true</code></pre></div></article>
        <form><div data-composer-surface="true"><div id="prompt-textarea" role="textbox" contenteditable="true"></div><button type="button" data-testid="send-button">Send</button></div></form>
      </div>
      <div class="dark" id="nested-dark">An independently dark preview must not activate the page.</div>
    </main></div></body></html>`
}

const darkMarkers = [
  ['html class', 'class="dark"', ''],
  ['html data-theme', 'data-theme="dark"', ''],
  ['html data-color-scheme', 'data-color-scheme="dark"', ''],
  ['body class', '', 'class="dark"'],
  ['body data-theme', '', 'data-theme="dark"'],
  ['body data-color-scheme', '', 'data-color-scheme="dark"']
]

for (const width of [1440, 390]) {
  for (const [name, htmlAttributes, bodyAttributes] of darkMarkers) {
    test(`${name} activates shipped CSS at ${width}px without changing layout`, async ({ page }) => {
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.setViewportSize({ width, height: 900 })
      await page.setContent(fixture(htmlAttributes, bodyAttributes))
      await expect(page).toHaveTitle('Violet Void theme activation fixture')
      for (const selector of ['html', 'body', '#root', 'main', '#token-primary']) {
        await expect(page.locator(selector)).toHaveCSS('background-color', 'rgb(15, 15, 15)')
      }
      await expect(page.locator('#token-primary')).toHaveCSS('color', 'rgb(240, 240, 245)')
      await expect(page.locator('#token-secondary')).toHaveCSS('background-color', 'rgb(24, 24, 24)')
      await expect(page.locator('[data-composer-surface]')).toHaveCSS('background-color', 'rgb(24, 24, 24)')
      const composer = page.locator('#prompt-textarea')
      await composer.fill('Theme activation works')
      await expect(composer).toHaveText('Theme activation works')
      await expect(composer).toHaveCSS('caret-color', 'rgb(8, 189, 186)')
      await expect(page.locator('body')).toHaveCSS('font-family', /Rubik/)
      await expect(page.locator('code')).toHaveCSS('font-family', /JetBrains Mono/)
      await expect(page.locator('#native-width')).toHaveCSS('width', `${Math.min(640, width - 32)}px`)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect(errors).toEqual([])
    })
  }
}

for (const [name, htmlAttributes, bodyAttributes] of [
  ['unmarked document with a nested dark preview', '', ''],
  ['html light class', 'class="light"', ''],
  ['html light data-theme', 'data-theme="light"', ''],
  ['html light data-color-scheme', 'data-color-scheme="light"', ''],
  ['light attribute overrides a stale dark class', 'class="dark" data-theme="light"', ''],
  ['light root overrides a dark body', 'class="light"', 'class="dark"'],
  ['light body overrides a stale dark root', 'class="dark"', 'data-theme="light"']
]) {
  test(`${name} retains native colors`, async ({ page }) => {
    await page.setContent(fixture(htmlAttributes, bodyAttributes))
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(250, 251, 252)')
    await expect(page.locator('#token-primary')).toHaveCSS('background-color', 'rgb(32, 33, 35)')
    await expect(page.locator('[data-composer-surface]')).toHaveCSS('background-color', 'rgb(230, 231, 232)')
  })
}

test('theme changes activate and deactivate all scopes without reloading', async ({ page }) => {
  await page.setContent(fixture())
  for (const attribute of ['data-theme', 'data-color-scheme']) {
    for (const selector of ['html', 'body']) {
      await page.locator(selector).evaluate((element, attribute) => element.setAttribute(attribute, 'dark'), attribute)
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 15, 15)')
      await expect(page.locator('[data-composer-surface]')).toHaveCSS('background-color', 'rgb(24, 24, 24)')
      await page.locator(selector).evaluate((element, attribute) => element.setAttribute(attribute, 'light'), attribute)
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(250, 251, 252)')
      await expect(page.locator('[data-composer-surface]')).toHaveCSS('background-color', 'rgb(230, 231, 232)')
      await page.locator(selector).evaluate((element, attribute) => element.removeAttribute(attribute), attribute)
    }
  }
})
