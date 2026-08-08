const fs = require('node:fs')
const { defineConfig } = require('@playwright/test')

const executablePath = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].find((candidate) => candidate && fs.existsSync(candidate))

module.exports = defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  fullyParallel: true,
  use: {
    browserName: 'chromium',
    headless: true,
    launchOptions: executablePath ? { executablePath } : {}
  }
})
