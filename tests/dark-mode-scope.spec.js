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
        </style>
      </head>
      <body>
        <main data-testid="main"><div class="thread-content-max-width" data-testid="layout">Native content</div></main>
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
})

test('dark documents receive the Violet Void palette and wide layout', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.setContent(fixture('dark'))

  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 15, 15)')
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(240, 240, 245)')
  await expect(page.getByTestId('main')).toHaveCSS('background-color', 'rgb(15, 15, 15)')
  await expect(page.getByTestId('main')).toHaveCSS('color', 'rgb(240, 240, 245)')
  await expectWidthBehavior(page.getByTestId('layout'), 1680)
})
