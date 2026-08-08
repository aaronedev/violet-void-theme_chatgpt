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
    <html class="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${userStyleBody()}
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

function currentFixture(family) {
  const code = Array.from({ length: 260 }, (_, index) => `const line${index} = 'authenticated violet void';`).join('\n')
  const surfaceClasses = family === 'normal'
    ? 'relative h-full w-full overflow-clip rounded-3xl current-surface'
    : 'h-full w-full overflow-clip rounded-3xl current-surface'
  const headerClasses = family === 'normal'
    ? 'select-none sticky z-2 top-(--sticky-padding-top) current-header'
    : 'pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1 current-header'
  return `<!doctype html>
    <html class="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${userStyleBody()}
      html, body { margin: 0; min-height: 100%; overflow: visible !important; }
      .page-spacer { height: 150px; }
      pre.current-code-block { display: block; max-width: 100vw !important; min-height: 0; overflow: visible !important; padding: 0 !important; white-space: normal; width: 100% !important; }
      .current-surface { margin: 0 auto 320px; width: min(96vw, 1040px); }
      .current-header { justify-content: space-between; min-height: 36px; padding: 6px 12px; }
      .current-copy { border: 1px solid rgb(76, 76, 76); cursor: pointer; min-height: 28px; min-width: 28px; }
      .current-content { min-height: 2600px; padding: 16px; white-space: pre-wrap; }
    </style></head><body><main class="markdown"><div class="page-spacer"></div><pre class="overflow-visible! px-0! current-code-block" data-testid="current-pre"></pre></main>
    <script>
      const pre = document.querySelector('[data-testid="current-pre"]')
      const surface = document.createElement('div')
      surface.className = ${JSON.stringify(surfaceClasses)}
      surface.dataset.testid = 'current-surface'
      const header = document.createElement('div')
      header.className = ${JSON.stringify(headerClasses)}
      header.dataset.testid = 'current-header'
      const language = document.createElement('span')
      language.textContent = 'JavaScript'
      const copy = document.createElement('button')
      copy.className = 'current-copy'
      copy.type = 'button'
      copy.setAttribute('aria-label', 'Copy')
      copy.textContent = 'Copy'
      header.append(${family === 'normal' ? 'language, copy' : 'copy'})
      const content = document.createElement('div')
      content.className = 'current-content'
      content.textContent = ${JSON.stringify(code)}
      surface.append(header, content)
      pre.append(surface)
      copy.addEventListener('click', (event) => { event.currentTarget.textContent = 'Copied' })
    </script></body></html>`
}

async function assertCurrentLiveCopyControl(page, family) {
  await page.setContent(currentFixture(family))
  const surface = page.getByTestId('current-surface')
  const header = page.getByTestId('current-header')
  const copy = page.getByRole('button', { name: 'Copy' })
  await page.evaluate(() => {
    const surfaceElement = document.querySelector('[data-testid="current-surface"]')
    window.scrollTo(0, surfaceElement.offsetTop + 360)
  })
  await expect(surface).toHaveCSS('overflow', 'clip')
  await expect(header).toHaveCSS('position', 'sticky')
  await expect(copy).toBeVisible()
  await expect(copy).toBeEnabled()
  const box = await copy.boundingBox()
  expect(box).not.toBeNull()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual((await page.viewportSize()).width)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.y + box.height).toBeLessThanOrEqual((await page.viewportSize()).height)
  await copy.click()
  await expect(copy).toHaveText('Copied')
}

test('overflow-hidden rounded code wrapper keeps Copy sticky on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await assertStickyCopyControl(page, 'overflow-hidden rounded-xl')
})

test('contain-inline-size code wrapper keeps Copy sticky on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await assertStickyCopyControl(page, 'contain-inline-size')
})

test('current normal authenticated code block keeps Copy sticky on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await assertCurrentLiveCopyControl(page, 'normal')
})

test('current normal authenticated code block keeps Copy sticky on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await assertCurrentLiveCopyControl(page, 'normal')
})

test('current compact authenticated code block keeps Copy sticky on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await assertCurrentLiveCopyControl(page, 'compact')
})

test('current compact authenticated code block keeps Copy sticky on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await assertCurrentLiveCopyControl(page, 'compact')
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
