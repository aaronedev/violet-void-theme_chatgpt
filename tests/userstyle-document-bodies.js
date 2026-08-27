const fs = require('node:fs')
const path = require('node:path')

const canonicalPath = path.resolve(__dirname, '../src/chatgpt-violet-void.user.css')

function matchingBrace(stylesheet, openingBrace) {
  let depth = 0
  let quote = null
  let comment = false

  for (let index = openingBrace; index < stylesheet.length; index += 1) {
    const character = stylesheet[index]
    const next = stylesheet[index + 1]

    if (comment) {
      if (character === '*' && next === '/') {
        comment = false
        index += 1
      }
      continue
    }

    if (!quote && character === '/' && next === '*') {
      comment = true
      index += 1
      continue
    }

    if (quote) {
      if (character === '\\') {
        index += 1
      } else if (character === quote) {
        quote = null
      }
      continue
    }

    if (character === '"' || character === "'") {
      quote = character
    } else if (character === '{') {
      depth += 1
    } else if (character === '}') {
      depth -= 1
      if (depth === 0) {
        return index
      }
    }
  }

  throw new Error('Unable to match a top-level @-moz-document block.')
}

function appliesToHostname(header, hostname) {
  const domains = [...header.matchAll(/domain\(\s*["']([^"']+)["']\s*\)/g)].map((match) => match[1])
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
}

function userStyleBodiesForHostname(hostname) {
  const stylesheet = fs.readFileSync(canonicalPath, 'utf8')
  const bodies = []
  const marker = '@-moz-document'
  let cursor = 0

  while (true) {
    const documentRule = stylesheet.indexOf(marker, cursor)
    if (documentRule < 0) {
      return bodies.join('\n')
    }

    const openingBrace = stylesheet.indexOf('{', documentRule)
    if (openingBrace < 0) {
      throw new Error('Unable to find a top-level @-moz-document opening brace.')
    }

    const closingBrace = matchingBrace(stylesheet, openingBrace)
    const header = stylesheet.slice(documentRule + marker.length, openingBrace)
    if (appliesToHostname(header, hostname)) {
      bodies.push(stylesheet.slice(openingBrace + 1, closingBrace))
    }
    cursor = closingBrace + 1
  }
}

module.exports = { userStyleBodiesForHostname }
