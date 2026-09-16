import test from 'node:test'
import assert from 'node:assert/strict'
import { extractShortcodes, parsePostOg, hasSession } from './instagram.js'

test('extractShortcodes collecte p/reel uniques', () => {
  const html = '<a href="/p/ABC123xyz_-/">x</a><a href="/reel/DEF456/">y</a><a href="/p/ABC123xyz_-/">x</a>'
  assert.deepEqual(extractShortcodes(html), ['ABC123xyz_-', 'DEF456'])
})

test('parsePostOg lit le condensé du post', () => {
  const html = `<html><head>
    <meta property="og:title" content="Ugreen on Instagram" />
    <meta property="og:description" content="1,234 likes, Gagnez un iPhone 18 Pro !" />
    <meta property="og:image" content="https://x.com/i.jpg" />
  </head></html>`
  const og = parsePostOg(html, 'https://www.instagram.com/p/X/')
  assert.equal(og.title, 'Ugreen on Instagram')
  assert.match(og.description, /iPhone 18/)
})

test('parsePostOg détecte le mur de login', () => {
  const og = parsePostOg('<html><head><title>Login • Instagram</title></head></html>', 'https://www.instagram.com/p/X/')
  assert.equal(og, null)
})

test('hasSession faux sans cookies', () => {
  delete process.env.IG_COOKIES
  assert.equal(hasSession(), false)
})
