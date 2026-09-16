import test from 'node:test'
import assert from 'node:assert/strict'
import { parseOg } from './og.js'

test('parseOg lit og:title / og:image', () => {
  const html = `<html><head>
    <meta property="og:title" content="Win an iPhone 17 Pro !" />
    <meta property="og:image" content="https://x.com/img.jpg" />
    <meta property="og:description" content="Giveaway" />
    <title>Fallback title</title>
  </head></html>`
  const og = parseOg(html, 'https://x.com/post')
  assert.equal(og.title, 'Win an iPhone 17 Pro !')
  assert.equal(og.image, 'https://x.com/img.jpg')
  assert.equal(og.description, 'Giveaway')
})

test('parseOg fallback sur <title> puis hostname', () => {
  const og1 = parseOg('<html><head><title>Mon concours</title></head></html>', 'https://example.com/a')
  assert.equal(og1.title, 'Mon concours')
  assert.equal(og1.image, undefined)
  const og2 = parseOg('<html></html>', 'https://www.instagram.com/p/ABC123/')
  assert.match(og2.title, /instagram/i)
})

test('parseOg ne crash jamais sur entrée vide', () => {
  const og = parseOg('', '')
  assert.equal(typeof og.title, 'string')
})
