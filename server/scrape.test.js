import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cleanTitle,
  detectTier,
  detectLanguage,
  detectGeo,
  detectPlatform,
  keepItem,
  isFinished,
  isStale,
  isAncient,
  titleKey,
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

test('isFinished drops ended contests, keeps last-chance', () => {
  assert.equal(isFinished('[Terminé] ActivityTracker : 5 codes à gagner'), true)
  assert.equal(isFinished('*TERMINÉ* One FM offre l’iPhone 17'), true)
  assert.equal(isFinished('Giveaway has ended: winners announced'), true)
  assert.equal(isFinished('9to5Rewards: Last chance to win iPhone 17 Pro'), false)
  assert.equal(isFinished('Tentez de gagner un iPhone 17, fin le 30 septembre 2026'), false)
})

test('keepItem drops finished contests', () => {
  assert.equal(keepItem('[Terminé] Jeu concours : gagnez un iPhone 17'), false)
  assert.equal(keepItem('TOP JEU - Tentez de gagner un iPhone 17'), true)
})

test('isStale flags old undated items only', () => {
  const now = Date.parse('2026-09-16T12:00:00Z')
  assert.equal(isStale('2026-06-01T00:00:00Z', now), true)
  assert.equal(isStale('2026-08-01T00:00:00Z', now), false)
  assert.equal(isStale('2026-09-10T00:00:00Z', now), false)
  assert.equal(isStale(null, now), false)
})

test('isAncient flags 6+ month old items', () => {
  const now = Date.parse('2026-09-16T12:00:00Z')
  assert.equal(isAncient('2026-01-01T00:00:00Z', now), true)
  assert.equal(isAncient('2026-06-01T00:00:00Z', now), false)
  assert.equal(isAncient(null, now), false)
})

test('keepItem drops staged/fake-news stories', () => {
  assert.equal(keepItem('Influencer slammed for staging iPhone giveaway in Vietnam'), false)
  assert.equal(keepItem('Ivana Alawi buys 100 iPhones for fan giveaway'), false)
  assert.equal(keepItem('Win an iPhone 17 + AirPods 4 | OLBG Prizes Giveaway'), true)
})

test('titleKey normalizes for dedupe', () => {
  const a = titleKey('Win an iPhone 18! Get 25% Off - PR Newswire')
  const b = titleKey('win an iphone 18  get 25% off - star beacon')
  assert.equal(a, b)
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
  assert.equal(e.stale, false)
})
