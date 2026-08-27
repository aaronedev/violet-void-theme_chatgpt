const { expect, test } = require('@playwright/test')

const { userStyleBodiesForHostname } = require('./userstyle-document-bodies')

function fixture(hostname) {
  return `<!doctype html>
    <html class="dark" data-theme="dark">
      <head>
        <style>
          :where([data-theme="dark"]) {
            --gray-100: #181818;
            --gray-200: #212121;
            --color-gray-100: var(--gray-100);
            --color-gray-200: var(--gray-200);
            --color-surface: var(--gray-200);
            --color-surface-secondary: var(--gray-100);
          }

          .bg-surface { background-color: var(--color-surface); }
          .bg-surface-secondary { background-color: var(--color-surface-secondary); }
          .prompt-scroll-frame { background: inherit; }

          ${userStyleBodiesForHostname(hostname)}
        </style>
      </head>
      <body>
        <section class="bg-surface" data-testid="prompt-card">
          <div class="prompt-scroll-frame" data-testid="prompt-frame">Starter prompt</div>
        </section>
        <div class="bg-surface-secondary" data-testid="secondary-surface">Secondary surface</div>
      </body>
    </html>`
}

test('Learn dark documentation retains its native primary and secondary surfaces', async ({ page }) => {
  await page.setContent(fixture('learn.chatgpt.com'))

  await expect(page.getByTestId('prompt-card')).toHaveCSS('background-color', 'rgb(33, 33, 33)')
  await expect(page.getByTestId('prompt-frame')).toHaveCSS('background-color', 'rgb(33, 33, 33)')
  await expect(page.getByTestId('secondary-surface')).toHaveCSS('background-color', 'rgb(24, 24, 24)')
})

test('the shared ChatGPT body alone reproduces Learn surface washout', async ({ page }) => {
  await page.setContent(fixture('chatgpt.com'))

  await expect(page.getByTestId('prompt-card')).toHaveCSS('background-color', 'rgb(184, 184, 192)')
  await expect(page.getByTestId('prompt-frame')).toHaveCSS('background-color', 'rgb(184, 184, 192)')
  await expect(page.getByTestId('secondary-surface')).toHaveCSS('background-color', 'rgb(184, 184, 192)')
})
