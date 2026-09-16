import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cleanTitle,
  detectTier,
  detectLanguage,
  detectGeo,
  detectPlatform,
  keepItem,
  canonicalUrl,
  makeId,
  normalize,
} from './scrape.js'

test('cleanTitle strips CDATA and collapses spaces', () => {
  assert.equal(cleanTitle('<![CDATA[ Gagner   un iPhone 17 ]]>'), 'Gagner un iPhone 17')
})

test('detectTier ranks 18 over 17 over apple', () => {
  assert.equal(detectTier('Win a Free iPhone 18 Pro Max').tier, 'iphone-18')
  assert.equal(detectTier('Gagnez un iPhone 17 Pro').tier, 'iphone-17')
  assert.equal(detectTier('Win AirPods Pro 2').tier, 'apple')
  assert.equal(detectTier('Win a Free iPhone 18, Get 25% Off').tier, 'iphone-18')
})

test('detectTier extracts model variant', () => {
  assert.equal(detectTier('9to5Rewards: win iPhone 17 Pro/Air').name, 'iPhone 17 Pro')
})

test('detectLanguage fr vs en with fallback', () => {
  assert.equal(detectLanguage('Jeu concours : gagnez un iPhone 17', 'en'), 'fr')
  assert.equal(detectLanguage('MacRumors Giveaway: Win an iPhone 17', 'fr'), 'en')
  assert.equal(detectLanguage('Something neutral here', 'fr'), 'fr')
})

test('detectGeo never excludes, only tags', () => {
  assert.equal(detectGeo('Concours Nantes : iPhone à gagner', '', 'fr').scope, 'nantes')
  assert.equal(detectGeo('Jeu concours France métropolitaine', '', 'fr').scope, 'fr')
  assert.equal(detectGeo('Albania contest win iPhone', '', 'en').scope, 'world')
  assert.equal(detectGeo('Giveaway win iPhone 18', '', 'en').scope, 'world')
})

test('detectPlatform maps domains', () => {
  assert.equal(detectPlatform('https://www.instagram.com/p/abc'), 'instagram')
  assert.equal(detectPlatform('https://youtu.be/xyz'), 'youtube')
  assert.equal(detectPlatform('https://www.macrumors.com/x'), 'site')
})

test('keepItem requires intent + prize, drops noise', () => {
  assert.equal(keepItem('MacRumors Giveaway: Win an iPhone 17'), true)
  assert.equal(keepItem('Jeu concours : tentez de gagner un iPhone 17'), true)
  assert.equal(keepItem("Il a aidé le chauffeur à gagner l'iPhone, nous l'avons retrouvé"), false)
  assert.equal(keepItem('Weather today in Nantes'), false)
})

test('canonicalUrl strips tracking params', () => {
  assert.equal(canonicalUrl('https://x.com/a?utm_source=rss#frag'), 'https://x.com/a')
})

test('makeId is stable and 12 chars', () => {
  const a = makeId('t', 'u')
  assert.equal(a, makeId('t', 'u'))
  assert.equal(a.length, 12)
})

test('normalize builds a full Contest', () => {
  const e = normalize(
    { title: 'Europe 1 : Tentez de gagner un iPhone 17', link: 'https://www.europe1.fr/jeu?utm=x', isoDate: '2026-09-01T00:00:00Z' },
    { id: 'gn-fr-17', name: 'GN FR', lang: 'fr' },
    '2026-09-16T00:00:00.000Z',
  )
  assert.equal(e.prize.tier, 'iphone-17')
  assert.equal(e.language, 'fr')
  assert.equal(e.platform, 'site')
  assert.equal(e.geo.scope, 'fr')
  assert.equal(e.url, 'https://www.europe1.fr/jeu')
  assert.ok(Array.isArray(e.steps) && e.steps.length > 0)
  assert.equal(e.kind, 'auto')
})
