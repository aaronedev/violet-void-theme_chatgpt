const { expect, test } = require('@playwright/test')

const { userStyleBodiesForHostname } = require('./userstyle-document-bodies')

function fixture(hostname) {
  return `<!doctype html>
    <html class="dark" data-theme="dark">
      <head>
        <style>
          :where([data-theme="dark"]) {
            --gray-50: #b8b8c0;
            --gray-100: #b8b8c0;
            --gray-200: #b8b8c0;
            --gray-300: #b8b8c0;
            --gray-400: #b8b8c0;
            --gray-500: #b8b8c0;
            --gray-600: #b8b8c0;
            --gray-700: #b8b8c0;
            --gray-750: #b8b8c0;
            --gray-800: #b8b8c0;
            --gray-850: #b8b8c0;
            --gray-900: #b8b8c0;
            --gray-950: #b8b8c0;
            --color-gray-100: var(--gray-100);
            --color-gray-200: var(--gray-200);
            --color-background-primary-soft: var(--gray-300);
            --color-surface: var(--gray-200);
            --color-surface-secondary: var(--gray-100);
            --color-text: var(--gray-850);
          }

          .bg-primary-soft { background-color: var(--color-background-primary-soft); color: var(--color-text); }
          .bg-surface { background-color: var(--color-surface); }
          .bg-surface-secondary { background-color: var(--color-surface-secondary); }
          .color-gray-100-consumer { background-color: var(--color-gray-100); }
          .color-gray-200-consumer { background-color: var(--color-gray-200); }
          .prompt-scroll-frame { background: inherit; }

          ${userStyleBodiesForHostname(hostname)}
        </style>
      </head>
      <body>
        <section class="bg-surface" data-testid="prompt-card">
          <div class="prompt-scroll-frame" data-testid="prompt-frame">Starter prompt</div>
        </section>
        <div class="bg-surface-secondary" data-testid="secondary-surface">Secondary surface</div>
        <div class="color-gray-100-consumer" data-testid="color-gray-100">Gray 100 consumer</div>
        <div class="color-gray-200-consumer" data-testid="color-gray-200">Gray 200 consumer</div>
        <div class="bg-primary-soft" data-testid="selected-nav">Use cases</div>
      </body>
    </html>`
}

test('Learn dark documentation retains its native primary and secondary surfaces', async ({
  page,
}) => {
  await page.setContent(fixture('learn.chatgpt.com'))

  await expect(page.getByTestId('prompt-card')).toHaveCSS(
    'background-color',
    'rgb(33, 33, 33)'
  )
  await expect(page.getByTestId('prompt-frame')).toHaveCSS(
    'background-color',
    'rgb(33, 33, 33)'
  )
  await expect(page.getByTestId('secondary-surface')).toHaveCSS(
    'background-color',
    'rgb(24, 24, 24)'
  )
  await expect(page.getByTestId('color-gray-100')).toHaveCSS(
    'background-color',
    'rgb(24, 24, 24)'
  )
  await expect(page.getByTestId('color-gray-200')).toHaveCSS(
    'background-color',
    'rgb(33, 33, 33)'
  )
  await expect(page.getByTestId('selected-nav')).toHaveCSS(
    'background-color',
    'rgb(48, 48, 48)'
  )
  await expect(page.getByTestId('selected-nav')).toHaveCSS(
    'color',
    'rgb(184, 184, 192)'
  )

  const grays = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement)
    return Object.fromEntries([
      ['50', style.getPropertyValue('--gray-50').trim()],
      ['100', style.getPropertyValue('--gray-100').trim()],
      ['200', style.getPropertyValue('--gray-200').trim()],
      ['300', style.getPropertyValue('--gray-300').trim()],
      ['400', style.getPropertyValue('--gray-400').trim()],
      ['500', style.getPropertyValue('--gray-500').trim()],
      ['600', style.getPropertyValue('--gray-600').trim()],
      ['700', style.getPropertyValue('--gray-700').trim()],
      ['750', style.getPropertyValue('--gray-750').trim()],
      ['800', style.getPropertyValue('--gray-800').trim()],
      ['900', style.getPropertyValue('--gray-900').trim()],
      ['950', style.getPropertyValue('--gray-950').trim()],
    ])
  })
  expect(grays).toEqual({
    50: '#131313',
    100: '#181818',
    200: '#212121',
    300: '#303030',
    400: '#414141',
    500: '#5d5d5d',
    600: '#8f8f8f',
    700: '#afafaf',
    750: '#b9b9b9',
    800: '#cdcdcd',
    900: '#ededed',
    950: '#f3f3f3',
  })
})

test('the shared ChatGPT body alone reproduces Learn surface washout', async ({
  page,
}) => {
  await page.setContent(fixture('chatgpt.com'))

  await expect(page.getByTestId('prompt-card')).toHaveCSS(
    'background-color',
    'rgb(184, 184, 192)'
  )
  await expect(page.getByTestId('prompt-frame')).toHaveCSS(
    'background-color',
    'rgb(184, 184, 192)'
  )
  await expect(page.getByTestId('secondary-surface')).toHaveCSS(
    'background-color',
    'rgb(184, 184, 192)'
  )
  await expect(page.getByTestId('color-gray-100')).toHaveCSS(
    'background-color',
    'rgb(184, 184, 192)'
  )
  await expect(page.getByTestId('color-gray-200')).toHaveCSS(
    'background-color',
    'rgb(184, 184, 192)'
  )
  await expect(page.getByTestId('selected-nav')).toHaveCSS(
    'background-color',
    'rgb(184, 184, 192)'
  )
})
