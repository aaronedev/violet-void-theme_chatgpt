const { expect, test } = require('@playwright/test')

const { userStyleBodiesForHostname } = require('./userstyle-document-bodies')

function userStyleBody() {
  return userStyleBodiesForHostname('chatgpt.com')
}

function fixture(documentClass = '') {
  return `<!doctype html>
    <html${documentClass ? ` class="${documentClass}"` : ''}>
      <head>
        <style>
          ${userStyleBody()}
          html, body {
            background: rgb(250, 251, 252);
            color: rgb(20, 21, 22);
            margin: 0;
          }
          main {
            background: rgb(240, 241, 242);
            color: rgb(30, 31, 32);
          }
          .thread-content-max-width {
            inline-size: 42rem;
            max-inline-size: 42rem;
          }
          #vv-firefox-block-caret {
            display: none;
          }
        </style>
      </head>
      <body>
        <main data-testid="main">
          <div class="thread-content-max-width" data-testid="layout">Native content</div>
          <div class="bg-token-main-surface-secondary" data-testid="secondary-surface">Surface</div>
          <code data-testid="code">const violetVoid = true</code>
          <div data-testid="composer" contenteditable="true">Compose</div>
        </main>
        <div id="vv-firefox-block-caret" data-visible="true" data-testid="firefox-block-caret"></div>
      </body>
    </html>`
}

async function expectWidthBehavior(locator, width) {
  const dimensions = await locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      maxWidth: Number.parseFloat(style.maxWidth),
      width: Number.parseFloat(style.width)
    }
  })

  expect(dimensions.width).toBeCloseTo(width, 1)
  expect(dimensions.maxWidth).toBeCloseTo(width, 1)
}

test('light documents retain native colors and content width', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.setContent(fixture())

  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(250, 251, 252)')
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(20, 21, 22)')
  await expect(page.getByTestId('main')).toHaveCSS('background-color', 'rgb(240, 241, 242)')
  await expect(page.getByTestId('main')).toHaveCSS('color', 'rgb(30, 31, 32)')
  await expectWidthBehavior(page.getByTestId('layout'), 672)

  await expect(page.getByTestId('layout')).toHaveJSProperty('offsetLeft', 0)
})

test('dark documents receive the Violet Void palette while retaining native layout', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.setContent(fixture('dark'))

  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 15, 15)')
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(240, 240, 245)')
  await expect(page.getByTestId('main')).toHaveCSS('background-color', 'rgb(15, 15, 15)')
  await expect(page.getByTestId('main')).toHaveCSS('color', 'rgb(240, 240, 245)')
  await expect(page.getByTestId('secondary-surface')).toHaveCSS('background-color', 'rgb(24, 24, 24)')
  await expectWidthBehavior(page.getByTestId('layout'), 672)
  await expect(page.getByTestId('layout')).toHaveJSProperty('offsetLeft', 0)

  const uiFont = await page.locator('body').evaluate((element) => getComputedStyle(element).fontFamily)
  expect(uiFont).toContain('Rubik')
  const codeFont = await page.getByTestId('code').evaluate((element) => getComputedStyle(element).fontFamily)
  expect(codeFont).toContain('JetBrains Mono')
  await expect(page.getByTestId('composer')).toHaveCSS('caret-color', 'rgb(8, 189, 186)')
  await expect(page.getByTestId('firefox-block-caret')).toHaveCSS('display', 'block')
  await expect(page.getByTestId('firefox-block-caret')).toHaveCSS('background-color', 'rgb(8, 189, 186)')

  const caret = await page.getByTestId('firefox-block-caret').evaluate((element) => {
    const style = getComputedStyle(element)
    return { minWidth: Number.parseFloat(style.minWidth), width: element.getBoundingClientRect().width }
  })
  expect(caret.minWidth).toBeGreaterThanOrEqual(8)
  expect(caret.width).toBeGreaterThanOrEqual(8)
})
