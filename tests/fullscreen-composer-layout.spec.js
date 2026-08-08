const fs = require('node:fs')
const path = require('node:path')
const { expect, test } = require('@playwright/test')

const canonicalPath = path.resolve(__dirname, '../src/chatgpt-violet-void.user.css')
const retainedComposerWidth = 40 * 16
const retainedNestedWidth = 48 * 16

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

function fixture({ disableImageAlignment = false, disableImageMaxWidth = false, screenshotControl = false } = {}) {
  const imageControl = disableImageAlignment ? 'style="justify-content: flex-start !important"' : ''
  const sentImageControl = disableImageMaxWidth ? 'style="max-inline-size: none !important"' : ''
  const outerControl = screenshotControl
    ? 'style="--thread-content-max-width: 40rem !important; inline-size: 40rem !important; margin-inline: 0 !important; max-inline-size: 40rem !important"'
    : ''
  const turnControl = screenshotControl
    ? 'style="--thread-content-max-width: 48rem !important; inline-size: 48rem !important; margin-inline: 0 !important; max-inline-size: 48rem !important"'
    : ''
  const rowControl = screenshotControl ? 'style="align-items: flex-start !important; flex-direction: row !important"' : ''
  const nestedControl = screenshotControl
    ? 'style="flex: 0 0 48rem !important; inline-size: 48rem !important; margin-inline: 0 !important; max-inline-size: 48rem !important"'
    : ''
  const previewControl = screenshotControl ? 'style="margin-block-start: 1rem !important; order: 0 !important"' : ''

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
      .turn-shell, .composer-wrapper {
        --thread-content-max-width: 40rem;
        inline-size: 100%;
        margin-inline: 0;
        max-inline-size: var(--thread-content-max-width);
      }
      .turn-shell { --thread-content-max-width: 48rem; display: flex; flex-direction: column; }
      [data-message-author-role="user"] { display: flex; inline-size: 100%; }
      #sent-image { block-size: 10rem; inline-size: 100rem; object-fit: cover; }
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
          <article class="turn" data-testid="conversation-turn-1"><div class="turn-shell [--thread-content-max-width:40rem] @w-lg/main:[--thread-content-max-width:48rem] mx-auto max-w-(--thread-content-max-width) flex-1 group/turn-messages w-full" data-testid="turn-shell" ${turnControl}>
            <div data-message-author-role="user" data-testid="user-message" ${imageControl}><img id="sent-image" data-testid="sent-image" alt="Sent attachment" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" ${sentImageControl}></div>
          </div></article>
        </section>
        <section id="thread-bottom-container"><div class="composer-wrapper [--thread-content-max-width:40rem] @w-lg/main:[--thread-content-max-width:48rem] mx-auto max-w-(--thread-content-max-width) flex-1 mb-(--composer-overflow-padding) pointer-events-auto" data-testid="composer-wrapper" ${outerControl}>
          <div class="w-full" data-testid="composer-child-shell"><div id="attachment-row" data-testid="attachment-row" ${rowControl}>
            <div id="nested-shell" data-testid="nested-shell" ${nestedControl}><form class="group/composer w-full" data-testid="composer-form"><div data-composer-surface="true" data-testid="composer-surface" contenteditable="true"></div></form></div>
            <div id="attachment-preview" data-testid="attachment-preview" ${previewControl}></div>
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
    const main = document.querySelector('#main')
    const mainBox = main.getBoundingClientRect()
    const mainStyle = getComputedStyle(main)
    const userBubbleProbe = document.createElement('div')
    userBubbleProbe.style.cssText = 'inline-size: var(--void-user-bubble-width); position: absolute; visibility: hidden'
    document.body.append(userBubbleProbe)
    const userBubbleWidth = userBubbleProbe.getBoundingClientRect().width
    userBubbleProbe.remove()
    return {
      attachment: rect('attachment-preview'),
      child: rect('composer-child-shell'),
      composer: rect('composer-wrapper'),
      form: rect('composer-form'),
      mainContent: {
        left: mainBox.left + Number.parseFloat(mainStyle.paddingInlineStart),
        right: mainBox.right - Number.parseFloat(mainStyle.paddingInlineEnd),
        width: mainBox.width - Number.parseFloat(mainStyle.paddingInlineStart) - Number.parseFloat(mainStyle.paddingInlineEnd)
      },
      nested: rect('nested-shell'),
      rowDirection: getComputedStyle(document.querySelector('#attachment-row')).flexDirection,
      scrollWidth: document.documentElement.scrollWidth,
      sentImage: rect('sent-image'),
      surface: rect('composer-surface'),
      turn: rect('turn-shell'),
      userJustifyContent: getComputedStyle(document.querySelector('[data-testid="user-message"]')).justifyContent,
      userBubbleWidth,
      viewportWidth: window.innerWidth
    }
  })
}

function expectSharedEdges(first, second, tolerance = 1) {
  expect(Math.abs(first.left - second.left)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(first.right - second.right)).toBeLessThanOrEqual(tolerance)
}

function expectWithin(rect, container, tolerance = 1) {
  expect(rect.left).toBeGreaterThanOrEqual(container.left - tolerance)
  expect(rect.right).toBeLessThanOrEqual(container.right + tolerance)
}

async function assertFixedLayout(page, viewport, { assertImageEdge = false } = {}) {
  await page.setViewportSize(viewport)
  await page.setContent(fixture())
  const layout = await geometry(page)

  expectSharedEdges(layout.turn, layout.composer)
  expectSharedEdges(layout.turn, layout.mainContent)
  expectSharedEdges(layout.composer, layout.mainContent)
  expect(layout.rowDirection).toBe('column')
  expect(layout.userJustifyContent).toBe('flex-end')
  if (assertImageEdge) {
    expect(layout.sentImage.right).toBeGreaterThanOrEqual(layout.turn.right - 1)
  }
  expectWithin(layout.sentImage, layout.turn)
  expect(layout.sentImage.width).toBeLessThanOrEqual(Math.min(layout.userBubbleWidth, layout.turn.width) + 1)
  expect(layout.attachment.bottom).toBeLessThanOrEqual(layout.surface.top)
  expectWithin(layout.attachment, layout.composer)
  expectWithin(layout.surface, layout.composer)
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1)

  return layout
}

test('authenticated fullscreen desktop widens turn and composer to the main column', async ({ page }) => {
  const layout = await assertFixedLayout(page, { width: 1920, height: 1080 }, { assertImageEdge: true })

  expect(layout.turn.width).toBeGreaterThan(retainedNestedWidth + 128)
  expect(layout.composer.width).toBeGreaterThan(retainedNestedWidth + 128)
  expect(layout.turn.width / layout.mainContent.width).toBeGreaterThan(0.98)
  expect(layout.composer.width / layout.mainContent.width).toBeGreaterThan(0.98)
})

test('authenticated fullscreen mobile shares the available main-column edges', async ({ page }) => {
  const layout = await assertFixedLayout(page, { width: 390, height: 844 })

  expect(layout.turn.width).toBeLessThan(retainedComposerWidth)
  expect(layout.composer.width).toBeLessThan(retainedComposerWidth)
})

test('disabling sent-image alignment breaks the direct image right edge', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.setContent(fixture({ disableImageAlignment: true }))
  const layout = await geometry(page)

  expect(layout.userJustifyContent).toBe('flex-start')
  expect(layout.sentImage.right).toBeLessThan(layout.turn.right - 8)
})

test('disabling sent-image max width exceeds the computed bubble limit', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.setContent(fixture({ disableImageMaxWidth: true }))
  const layout = await geometry(page)

  expect(layout.userJustifyContent).toBe('flex-end')
  expect(layout.sentImage.width).toBeGreaterThan(layout.userBubbleWidth + 1)
})

test('screenshot control retains narrow shells and a lower-right overlapping preview', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.setContent(fixture({ screenshotControl: true }))
  const layout = await geometry(page)

  expect(layout.turn.width).toBeLessThanOrEqual(retainedNestedWidth + 1)
  expect(layout.composer.width).toBeLessThanOrEqual(retainedComposerWidth + 1)
  expect(layout.nested.width).toBeGreaterThanOrEqual(retainedNestedWidth - 1)
  expect(layout.surface.left + layout.surface.width / 2).toBeLessThan(layout.mainContent.left + layout.mainContent.width / 2 - 100)
  expect(layout.rowDirection).toBe('row')
  expect(layout.attachment.left).toBeGreaterThan(layout.surface.left)
  expect(layout.attachment.left).toBeGreaterThanOrEqual(layout.surface.right - 1)
  expect(layout.attachment.top).toBeGreaterThan(layout.surface.top)
  expect(layout.attachment.top).toBeLessThan(layout.surface.bottom)
  expect(layout.attachment.bottom).toBeGreaterThan(layout.surface.top)
})
