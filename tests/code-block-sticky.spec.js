const fs = require('node:fs')
const path = require('node:path')
const { expect, test } = require('@playwright/test')

const canonicalPath = path.resolve(__dirname, '../src/chatgpt-violet-void.user.css')

function userStyleBody() {
  const stylesheet = fs.readFileSync(canonicalPath, 'utf8')
  const documentRule = stylesheet.indexOf('@-moz-document')
  const openingBrace = stylesheet.indexOf('{', documentRule)
  const closingBrace = stylesheet.lastIndexOf('}')

  if (documentRule < 0 || openingBrace < 0 || closingBrace <= openingBrace) {
    throw new Error('Unable to extract the canonical UserStyle document body.')
  }

  return stylesheet.slice(openingBrace + 1, closingBrace)
}

function fixture(wrapperClass) {
  const code = Array.from({ length: 260 }, (_, index) => `const line${index} = 'violet void';`).join('\n')
  return `<!doctype html>
    <html class="dark"><head><style>${userStyleBody()}
      html, body { margin: 0; min-height: 100%; overflow: visible !important; }
      .page-spacer { height: 150px; }
      .code-shell { width: min(96vw, 1040px); margin: 0 auto 320px; }
      .code-header { align-items: center; display: flex; height: 48px; justify-content: space-between; padding: 0 16px; }
      .copy-button { background: rgb(27, 27, 27); border: 1px solid rgb(76, 76, 76); color: rgb(240, 240, 245); cursor: pointer; padding: 6px 10px; }
      .code-shell pre { min-height: 2600px; overflow: visible; padding: 16px; white-space: pre-wrap; }
    </style></head><body><main class="markdown"><div class="page-spacer"></div>
      <section id="legacy-code-shell" class="${wrapperClass} code-shell" data-testid="code-shell">
        <div class="code-header" data-testid="code-header"><span>JavaScript</span><button class="copy-button" type="button">Copy</button></div>
        <pre><code>${code}</code></pre>
      </section>
    </main><script>document.querySelector('.copy-button').addEventListener('click', (event) => { event.currentTarget.textContent = 'Copied' })</script></body></html>`
}

function relativeLuminance([red, green, blue]) {
  const channel = (value) => {
    const normalized = value / 255
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
}

function contrast(first, second) {
  const firstLuminance = relativeLuminance(first)
  const secondLuminance = relativeLuminance(second)
  return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05)
}

async function assertStickyCopyControl(page, wrapperClass) {
  await page.setContent(fixture(wrapperClass))
  const shell = page.getByTestId('code-shell')
  const header = page.getByTestId('code-header')
  const copy = page.getByRole('button', { name: 'Copy' })

  await page.evaluate(() => {
    const shellElement = document.querySelector('[data-testid="code-shell"]')
    window.scrollTo(0, shellElement.offsetTop + 320)
  })

  await expect(copy).toBeVisible()
  await expect(copy).toBeEnabled()
  await expect(header).toHaveCSS('position', 'sticky')
  const box = await header.boundingBox()
  expect(box).not.toBeNull()
  expect(box.y).toBeGreaterThanOrEqual(-1)
  expect(box.y).toBeLessThanOrEqual(1)

  const readability = await header.evaluate((element) => {
    const parse = (value) => value.match(/\d+(?:\.\d+)?/g).slice(0, 3).map(Number)
    const headerStyle = getComputedStyle(element)
    const buttonStyle = getComputedStyle(element.querySelector('button'))
    return {
      headerForeground: parse(headerStyle.color),
      headerBackground: parse(headerStyle.backgroundColor),
      buttonForeground: parse(buttonStyle.color),
      buttonBackground: parse(buttonStyle.backgroundColor)
    }
  })
  expect(contrast(readability.headerForeground, readability.headerBackground)).toBeGreaterThanOrEqual(4.5)
  expect(contrast(readability.buttonForeground, readability.buttonBackground)).toBeGreaterThanOrEqual(4.5)

  await copy.click()
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
  await expect(shell).toHaveCSS('overflow', 'clip')
}

test('overflow-hidden rounded code wrapper keeps Copy sticky on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await assertStickyCopyControl(page, 'overflow-hidden rounded-xl')
})

test('contain-inline-size code wrapper keeps Copy sticky on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await assertStickyCopyControl(page, 'contain-inline-size')
})

test('legacy overflow hidden would trap the sticky header in the code wrapper', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.setContent(fixture('overflow-hidden rounded-xl'))
  await page.addStyleTag({ content: '#legacy-code-shell { overflow: hidden !important; }' })
  await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="code-shell"]')
    window.scrollTo(0, shell.offsetTop + 320)
  })
  const box = await page.getByTestId('code-header').boundingBox()
  expect(box).not.toBeNull()
  expect(box.y).toBeLessThan(-100)
})
