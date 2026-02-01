const stylus = require('stylus')
const fs = require('fs')
const path = require('path')

const inputFile = path.join(__dirname, '../src/main.styl')
const outputFile = path.join(__dirname, '../dist/main.css')

const stylusContent = fs.readFileSync(inputFile, 'utf8')

stylus(stylusContent)
  .set('filename', inputFile)
  .set('paths', [path.join(__dirname, '../src')])
  .render((err, css) => {
    if (err) {
      console.error('Build failed:', err)
      process.exit(1)
    }
    fs.writeFileSync(outputFile, css)
    console.log('Build successful: dist/main.css')
  })
