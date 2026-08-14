const fs = require('node:fs')
const path = require('node:path')
const { expect, test } = require('@playwright/test')

const canonicalPath = path.resolve(__dirname, '../src/chatgpt-violet-void.user.css')
const nativeComposerWidth = 40 * 16
const nativeTurnWidth = 48 * 16

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

function fixture({ disableAttachmentGuard = false, disableImageAlignment = false } = {}) {
  const attachmentControl = disableAttachmentGuard
    ? 'style="flex-direction: row !important"'
    : ''
  const imageControl = disableImageAlignment
    ? 'style="justify-content: flex-start !important"'
    : ''
  const imageSize = disableImageAlignment ? '16rem' : '100rem'

  return `<!doctype html>
    <html class="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
      ${userStyleBody()}
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; }
      #app { display: flex; min-height: 100vh; }
      #sidebar { background: #161323; flex: 0 0 15rem; inline-size: 15rem; }
      #main { background: #080611; flex: 1 1 auto; min-inline-size: 0; padding: 2rem; }
      #thread { min-block-size: 22rem; }
      .turn { padding-block: 1rem; }
      .turn-shell, .composer-wrapper { inline-size: 100%; margin-inline: 0; }
      .turn-shell { display: flex; flex-direction: column; max-inline-size: 48rem; }
      .composer-wrapper { background: #0f0b1e; max-inline-size: 40rem; padding: 0.75rem; }
      [data-message-author-role="user"] { display: flex; inline-size: 100%; }
      #sent-image { block-size: 10rem; inline-size: ${imageSize}; object-fit: cover; }
      #thread-bottom-container { margin-block-start: 3rem; }
      #attachment-row { align-items: flex-start; display: flex; flex-direction: row; gap: 0.75rem; }
      #attachment-preview { background: #ad76d4; block-size: 5rem; flex: 0 0 7rem; inline-size: 7rem; }
      #nested-shell { inline-size: 100%; }
      form { inline-size: 100%; margin: 0; max-inline-size: 100%; }
      [data-composer-surface="true"] { background: #1a1429; block-size: 6rem; inline-size: 100%; }
      @media (max-width: 820px) {
        #sidebar { display: none; }
        #main { padding: 1rem; }
      }
    </style></head><body>
      <div id="app"><aside id="sidebar"></aside><main id="main">
        <section id="thread">
          <article class="turn" data-testid="conversation-turn-1"><div class="turn-shell group/turn-messages max-w-(--thread-content-max-width)" data-testid="turn-shell">
            <div data-message-author-role="user" data-testid="user-message" ${imageControl}><img id="sent-image" data-testid="sent-image" alt="Sent attachment" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="></div>
          </div></article>
        </section>
        <section id="thread-bottom-container"><div class="composer-wrapper max-w-(--thread-content-max-width)" data-testid="composer-wrapper">
          <div id="attachment-row" data-testid="attachment-row" ${attachmentControl}>
            <div id="nested-shell" data-testid="nested-shell"><form data-testid="composer-form"><div data-composer-surface="true" data-testid="composer-surface" contenteditable="true"></div></form></div>
            <div id="attachment-preview" data-testid="attachment-preview"></div>
          </div>
        </div></section>
      </main></div>
    </body></html>`
}

async function geometry(page) {
  return page.evaluate(() => {
    const rect = (testId) => {
      const box = document.querySelector(`[data-testid="${testId}"]`).getBoundingClientRect()
      return { bottom: box.bottom, left: box.left, right: box.right, top: box.top, width: box.width }
    }
    const main = document.querySelector('#main')
    const mainBox = main.getBoundingClientRect()
    const mainStyle = getComputedStyle(main)
    return {
      attachment: rect('attachment-preview'),
      composer: rect('composer-wrapper'),
      mainContent: {
        left: mainBox.left + Number.parseFloat(mainStyle.paddingInlineStart),
        right: mainBox.right - Number.parseFloat(mainStyle.paddingInlineEnd),
        width: mainBox.width - Number.parseFloat(mainStyle.paddingInlineStart) - Number.parseFloat(mainStyle.paddingInlineEnd)
      },
      rowDirection: getComputedStyle(document.querySelector('#attachment-row')).flexDirection,
      scrollWidth: document.documentElement.scrollWidth,
      sentImage: rect('sent-image'),
      surface: rect('composer-surface'),
      turn: rect('turn-shell'),
      userJustifyContent: getComputedStyle(document.querySelector('[data-testid="user-message"]')).justifyContent,
      viewportWidth: window.innerWidth
    }
  })
}

function expectWithin(rect, container, tolerance = 1) {
  expect(rect.left).toBeGreaterThanOrEqual(container.left - tolerance)
  expect(rect.right).toBeLessThanOrEqual(container.right + tolerance)
}

test('desktop retains native turn and composer widths with attachment and image guards', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.setContent(fixture())
  const layout = await geometry(page)

  expect(layout.turn.width).toBeCloseTo(nativeTurnWidth, 1)
  expect(layout.composer.width).toBeCloseTo(nativeComposerWidth, 1)
  expect(layout.turn.width).toBeLessThan(layout.mainContent.width)
  expect(layout.composer.width).toBeLessThan(layout.mainContent.width)
  expect(layout.rowDirection).toBe('column')
  expect(layout.attachment.bottom).toBeLessThanOrEqual(layout.surface.top)
  expectWithin(layout.attachment, layout.composer)
  expect(layout.userJustifyContent).toBe('flex-end')
  expect(layout.sentImage.right).toBeGreaterThanOrEqual(layout.turn.right - 1)
  expect(layout.sentImage.width).toBeCloseTo(layout.turn.width, 1)
  expectWithin(layout.sentImage, layout.turn)
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1)
})

test('mobile shells fit the available native main width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setContent(fixture())
  const layout = await geometry(page)

  expect(layout.turn.width).toBeCloseTo(layout.mainContent.width, 1)
  expect(layout.composer.width).toBeCloseTo(layout.mainContent.width, 1)
  expectWithin(layout.turn, layout.mainContent)
  expectWithin(layout.composer, layout.mainContent)
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1)
})

test('explicitly disabling the attachment guard restores the row direction', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.setContent(fixture({ disableAttachmentGuard: true }))

  expect((await geometry(page)).rowDirection).toBe('row')
})

test('explicitly disabling direct-image alignment removes its end alignment', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.setContent(fixture({ disableImageAlignment: true }))
  const layout = await geometry(page)

  expect(layout.userJustifyContent).toBe('flex-start')
  expect(layout.sentImage.right).toBeLessThan(layout.turn.right - 8)
})
