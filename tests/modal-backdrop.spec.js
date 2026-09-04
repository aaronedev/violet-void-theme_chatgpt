const { expect, test } = require('@playwright/test')

const { userStyleBodiesForHostname } = require('./userstyle-document-bodies')

test('dark modal backdrops preserve native black alpha', async ({ page }) => {
  await page.setContent(`<!doctype html>
    <html class="dark">
      <head>
        <style>
          .bg-black\\/50 {
            background-color: rgba(0, 0, 0, 0.5);
          }

          ${userStyleBodiesForHostname('chatgpt.com')}
        </style>
      </head>
      <body>
        <main>Behind the modal</main>
        <div class="fixed inset-0 bg-black/50" data-testid="modal-backdrop"></div>
        <div role="dialog">Settings</div>
      </body>
    </html>`)

  await expect(page.getByTestId('modal-backdrop')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0.5)'
  )
  await expect(page.getByRole('dialog')).toHaveCSS(
    'background-color',
    'rgb(24, 24, 24)'
  )
})
