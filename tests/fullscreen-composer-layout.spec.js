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

function fixture({ control = false } = {}) {
  const attachmentControl = control ? 'style="align-items: flex-start !important; flex-direction: row !important"' : ''
  const nestedControl = control ? 'style="inline-size: 48rem !important; margin-inline: 0 !important; max-inline-size: 48rem !important"' : ''

  return `<!doctype html>
    <html class="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
      ${userStyleBody()}
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; }
      #app { display: flex; min-height: 100vh; }
      #sidebar { background: #161323; inline-size: 15rem; flex: 0 0 15rem; }
      #main { background: #080611; flex: 1 1 auto; min-inline-size: 0; padding: 2rem; }
      #thread { min-block-size: 22rem; }
      .turn { padding-block: 1rem; }
      .turn-shell, .composer-wrapper {
        --thread-content-max-width: 40rem;
        inline-size: 100%;
        margin-inline: auto;
        max-inline-size: var(--thread-content-max-width);
      }
      .turn-shell { display: flex; flex-direction: column; }
      [data-message-author-role="user"] { display: flex; inline-size: 100%; justify-content: flex-end; }
      #sent-image { background: #6a477e; block-size: 10rem; inline-size: 14rem; }
      #thread-bottom-container { margin-block-start: 3rem; }
      .composer-wrapper { background: #0f0b1e; padding: 0.75rem; }
      #attachment-row { align-items: flex-start; display: flex; flex-direction: row; gap: 0.75rem; }
      #attachment-preview { background: #ad76d4; block-size: 5rem; flex: 0 0 7rem; inline-size: 7rem; }
      #nested-shell { inline-size: 48rem; margin-inline: 0; max-inline-size: 48rem; }
      form { inline-size: 100%; margin: 0; max-inline-size: 100%; }
      [data-composer-surface="true"] { background: #1a1429; block-size: 6rem; inline-size: 100%; }
      @media (max-width: 820px) {
        #sidebar { display: none; }
        #main { padding: 1rem; }
      }
    </style></head><body>
      <div id="app"><aside id="sidebar"></aside><main id="main">
        <section id="thread">
          <article class="turn" data-testid="conversation-turn-1"><div class="turn-shell [--thread-content-max-width:40rem] @w-lg/main:[--thread-content-max-width:48rem] mx-auto max-w-(--thread-content-max-width) flex-1 group/turn-messages w-full" data-testid="turn-shell">
            <div data-message-author-role="user"><div id="sent-image" data-testid="sent-image"></div></div>
          </div></article>
        </section>
        <section id="thread-bottom-container"><div class="composer-wrapper [--thread-content-max-width:40rem] @w-lg/main:[--thread-content-max-width:48rem] mx-auto max-w-(--thread-content-max-width) flex-1 mb-(--composer-overflow-padding) pointer-events-auto" data-testid="composer-wrapper">
          <div class="w-full" data-testid="composer-child-shell"><div id="attachment-row" data-testid="attachment-row" ${attachmentControl}>
            <div id="attachment-preview" data-testid="attachment-preview"></div>
            <div id="nested-shell" data-testid="nested-shell" ${nestedControl}><form class="group/composer w-full" data-testid="composer-form"><div data-composer-surface="true" data-testid="composer-surface" contenteditable="true"></div></form></div>
          </div></div>
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
    return {
      attachment: rect('attachment-preview'),
      child: rect('composer-child-shell'),
      composer: rect('composer-wrapper'),
      form: rect('composer-form'),
      main: document.querySelector('#main').getBoundingClientRect().toJSON(),
      nested: rect('nested-shell'),
      rowDirection: getComputedStyle(document.querySelector('#attachment-row')).flexDirection,
      scrollWidth: document.documentElement.scrollWidth,
      sentImage: rect('sent-image'),
      surface: rect('composer-surface'),
      turn: rect('turn-shell'),
      viewportWidth: window.innerWidth
    }
  })
}

function center(rect) {
  return rect.left + rect.width / 2
}

function expectCentered(rect, container) {
  expect(Math.abs(center(rect) - center(container))).toBeLessThanOrEqual(1)
}

async function assertFixedLayout(page, viewport) {
  await page.setViewportSize(viewport)
  await page.setContent(fixture())
  const layout = await geometry(page)

  for (const rect of [layout.turn, layout.composer, layout.child, layout.nested, layout.form, layout.surface]) {
    expectCentered(rect, layout.main)
  }
  expect(layout.rowDirection).toBe('column')
  expect(layout.sentImage.right).toBeLessThanOrEqual(layout.turn.right + 1)
  expect(center(layout.sentImage)).toBeGreaterThan(center(layout.turn))
  expect(layout.attachment.bottom).toBeLessThanOrEqual(layout.surface.top)
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1)
}

test('authenticated fullscreen composer centers nested wide shells with attachment previews on desktop', async ({ page }) => {
  await assertFixedLayout(page, { width: 1920, height: 1080 })
})

test('authenticated fullscreen composer keeps nested wide shells and attachment previews inside mobile bounds', async ({ page }) => {
  await assertFixedLayout(page, { width: 390, height: 844 })
})

test('control retains the left-shifted nested composer and overlapping attachment row without the scoped fix', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.setContent(fixture({ control: true }))
  const layout = await geometry(page)

  expect(center(layout.surface)).toBeLessThan(center(layout.main) - 100)
  expect(layout.rowDirection).toBe('row')
  expect(layout.attachment.bottom).toBeGreaterThan(layout.surface.top)
})
