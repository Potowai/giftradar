import test from 'node:test'
import assert from 'node:assert/strict'
import { load } from 'cheerio'
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
  slugDate,
  slugPlatform,
  detectRisk,
  detectDeadline,
  parseDemonJeu,
  parseJcb,
  parseCdn,
  parseTg,
  rewriteTgEntry,
  canonicalUrl,
  makeId,
  normalize,
} from './scrape.js'

test('cleanTitle strips CDATA and collapses spaces', () => {
  assert.equal(cleanTitle('<![CDATA[ Gagnez   un iPhone 17 ]]>'), 'Gagnez un iPhone 17')
})

test('cleanTitle décode les entités HTML', () => {
  assert.equal(cleanTitle('Gagnez 1 iPhone&nbsp;Duo &amp; co'), 'Gagnez 1 iPhone Duo & co')
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

test('detectPlatform lit les indices X dans le titre', () => {
  assert.equal(detectPlatform('https://news.google.com/rss/articles/xyz', '#iphone18 #giveaway @team - x.com'), 'x')
  assert.equal(detectPlatform('https://news.google.com/rss/articles/xyz', 'Giveaway iPhone 18 Pro Max Follow @a Like & RT Tag a friend'), 'x')
  assert.equal(detectPlatform('https://news.google.com/rss/articles/xyz', 'MacRumors Giveaway: Win an iPhone 17'), 'site')
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

test('slugDate lit les deadlines FR des slugs', () => {
  assert.equal(slugDate('concours-x-gagnez-1-iphone-18-pro-max-sur-instagram-jusqu-au-20-septembre-2026.php'), '2026-09-20T00:00:00.000Z')
  assert.equal(slugDate('jeux-y-gagnez-1-iphone-18-pro-sur-facebook-jusqu-au-07-octobre-2026.php'), '2026-10-07T00:00:00.000Z')
  assert.equal(slugDate('concours-z-gagnez-1-iphone-17.php'), null)
  assert.equal(slugDate('x-jusqu-au-31-septembre-2026.php'), null)
})

test('slugPlatform lit la plateforme', () => {
  assert.equal(slugPlatform('concours-x-sur-instagram-jusqu-au-20-septembre-2026.php'), 'instagram')
  assert.equal(slugPlatform('2026/09/08/concours-facebook-le-roi-du-pare-brise-gagner-iphone-18.html'), 'facebook')
  assert.equal(slugPlatform('jeu-nextmobiles.com-gagnez-1-iphone-17e.html'), 'site')
})

test('detectDeadline lit JJ/MM/AAAA', () => {
  assert.equal(detectDeadline('Fin le 30/09/2026'), '2026-09-30T00:00:00.000Z')
})

test('detectRisk signale les arnaques probables', () => {
  assert.equal(detectRisk('Gagnez un iPhone, seuls les frais de port à payer'), true)
  assert.equal(detectRisk('Validez sur Telegram pour recevoir le lot'), true)
  assert.equal(detectRisk('MacRumors Giveaway: Win an iPhone 17'), false)
})

test('parseDemonJeu extrait fiches iPhone', () => {
  const $ = load(`<article id="article-concours-id-1" class="bloc-article">
    <h3><a data-concours-nom="factoryandco.com">factoryandco.com</a></h3>
    <a href="concours-factoryandco.com-gagnez-1-iphone-18-pro-max-sur-instagram-jusqu-au-20-septembre-2026.php">376888</a>
  </article>`)
  const out = parseDemonJeu($, 'https://www.ledemondujeu.com/')
  assert.equal(out.length, 1)
  assert.equal(out[0].platform, 'instagram')
  assert.equal(out[0].deadline, '2026-09-20T00:00:00.000Z')
  assert.match(out[0].link, /ledemondujeu\.com/)
})

test('parseJcb extrait fiches + fin relative', () => {
  const $ = load(`<article class="bloc-concours" id="fiche-concours-1">
    <h3 class="concours-title"><a>Ugreen</a></h3>
    <footer><a href="2026/09/16/concours-facebook-ugreen-gagner-iphone-18-pro.html" class="concours-id">jeu</a> ajouté le 16/09/2026</footer>
    <div>se termineront dans 21 jours</div>
  </article>`)
  const out = parseJcb($, 'https://www.jeu-concours.biz/', '2026-09-16T12:00:00.000Z')
  assert.equal(out.length, 1)
  assert.equal(out[0].platform, 'facebook')
  assert.equal(out[0].deadline, '2026-10-07T12:00:00.000Z')
})

test('parseCdn extrait cartes high-tech', () => {
  const $ = load(`<article class="concours-card"><a href="/jeu-concours-nextmobiles-x" aria-label="Voir la fiche du concours Remportez : Un iPhone 18 Pro.">x</a><div>Instagram</div><span>Fin le 30/09/2026</span><span>Publié il y a 1 jour</span></article>`)
  const out = parseCdn($, 'https://www.concours-du-net.com', '2026-09-16T12:00:00.000Z')
  assert.equal(out.length, 1)
  assert.equal(out[0].platform, 'instagram')
  assert.equal(out[0].deadline, '2026-09-30T00:00:00.000Z')
  assert.match(out[0].title, /iPhone 18 Pro/)
})

test('parseTg extrait lots, deadline et plateforme', () => {
  const html = `<p class="lots"><strong>Au tirage au sort :</strong> 1 iPhone 17 256 Go (999 €), 1 coque</p>
    <a href="/jeux-concours/ajoutes-le-15-09-2026.html">le 15/09/2026</a>
    <a class="btn participer" href="/concours/g2211584.html" target="_blank">Participer</a>
    <p class="datelimite"><a href="/jeux-concours/termines-le-20-09-2026.html">20/09/2026</a></p>
    <span title="Jeu-concours sur Instagram."><i></i></span>`
  const out = parseTg(html, 'https://toutgagner.com')
  assert.equal(out.length, 1)
  assert.equal(out[0].platform, 'instagram')
  assert.equal(out[0].deadline, '2026-09-20T00:00:00.000Z')
  assert.equal(out[0].isoDate, '2026-09-15T00:00:00.000Z')
  assert.match(out[0].title, /iPhone 17/)
})

test('rewriteTgEntry remplace par recherche directe', () => {
  const e = rewriteTgEntry({ title: 'Gagnez 1 iPhone 17 (ToutGagner)', url: 'https://toutgagner.com/concours/g1.html', source: 'ToutGagner smartphones' })
  assert.match(e.url, /^https:\/\/www\.google\.com\/search\?q=/)
  assert.match(decodeURIComponent(e.url), /1 iPhone 17/)
  assert.equal(e.fiche, 'https://toutgagner.com/concours/g1.html')
  assert.equal(e.id.length, 12)
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
