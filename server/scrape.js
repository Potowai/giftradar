import { createHash } from 'node:crypto'
import Parser from 'rss-parser'
import { readJson, writeJson } from './util.js'

const UA = process.env.USER_AGENT || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36'
const TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 12000)
const STAGGER_MS = 2500

const parser = new Parser({ timeout: TIMEOUT_MS, headers: { 'User-Agent': UA } })

const INTENT = /gagn|win|giveaway|concours|jeu\b|tentez|remporter|enter to win|chance|lot|tirage|quiz/i
const PRIZE = /iphone|apple|ipad|airpods|macbook|watch|ios/i
const NOISE = /retrouv|volé|volée|procès|arrêté|interpellé|escroquerie|arnaque|fake|mort|décès/i

const TIER_18 = /iphone\s*1\s*8|iphone\s*eighteen/i
const TIER_17 = /iphone\s*1\s*7|iphone\s*seventeen/i
const APPLE_OTHER = /apple|ipad|airpods|macbook|watch|app\s*store|itunes|ios/i

const GEO_NANTES = /nantes|loire-atlantique|\b44\b|pays de la loire/i
const GEO_FR = /france|français|francais|métropole|metropole|\.fr\b|paris|lyon|marseille|bordeaux|lille|toulouse/i
const GEO_EU = /europe|european|e\.u\.|\beu\b|belgique|suisse|espagne|italie|allemagne/i

const DEADLINE = /(?:ends?|closes?|deadline|fin|clôture|cloture|jusqu'au|avant le)\s*[:–-]?\s*([0-3]?\d(?:er)?\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+[0-3]?\d(?:st|nd|rd|th)?,?\s+\d{4})/i

const STEPS = {
  instagram: [{ label: 'Suivre le compte' }, { label: 'Liker le post' }, { label: 'Commenter + taguer' }],
  youtube: [{ label: "S'abonner à la chaîne" }, { label: 'Commenter la vidéo' }],
  tiktok: [{ label: 'Suivre le compte' }, { label: 'Liker la vidéo' }],
  facebook: [{ label: 'Suivre la page' }, { label: 'Partager le post' }],
  x: [{ label: 'Suivre le compte' }, { label: 'Reposter' }],
  site: [{ label: 'Remplir le formulaire' }],
}

export function cleanTitle(raw) {
  return String(raw || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function detectTier(title) {
  if (TIER_18.test(title)) return { name: modelName(title, '18'), tier: 'iphone-18' }
  if (TIER_17.test(title)) return { name: modelName(title, '17'), tier: 'iphone-17' }
  if (PRIZE.test(title)) return { name: shortPrize(title), tier: /iphone/i.test(title) ? 'iphone-17' : 'apple' }
  return { name: shortPrize(title), tier: 'other' }
}

function modelName(title, gen) {
  const m = title.match(new RegExp(`iphone\\s*${gen}\\s*(pro\\s*max|pro|air|plus|mini|e)?`, 'i'))
  const variant = (m && m[1] ? ' ' + m[1].trim() : '').replace(/\s+/g, ' ')
  return `iPhone ${gen}${variant}`.trim()
}

function shortPrize(title) {
  const m = title.match(/iphone[^,–—\-–|]{0,24}/i)
  if (m) return m[0].trim().replace(/\s+/g, ' ')
  return 'Lot Apple'
}

export function detectLanguage(title, fallback) {
  if (/gagn|concours|tentez|remporter|lot|tirage|jeu\b|france/i.test(title)) return 'fr'
  if (/win|giveaway|enter to win|chance to win/i.test(title)) return 'en'
  return fallback === 'fr' || fallback === 'en' ? fallback : 'other'
}

export function detectGeo(title, url, fallbackLang) {
  const hay = `${title} ${url || ''}`
  if (GEO_NANTES.test(hay)) return { scope: 'nantes', note: 'Nantes / 44' }
  if (GEO_FR.test(hay)) return { scope: 'fr', note: 'France' }
  if (GEO_EU.test(hay)) return { scope: 'eu', note: 'Europe' }
  return fallbackLang === 'fr' ? { scope: 'fr' } : { scope: 'world' }
}

export function detectDeadline(title) {
  const m = String(title || '').match(DEADLINE)
  if (!m) return null
  const d = new Date(m[1])
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function detectPlatform(url) {
  const u = String(url || '').toLowerCase()
  if (u.includes('instagram.com')) return 'instagram'
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  if (u.includes('tiktok.com')) return 'tiktok'
  if (u.includes('facebook.com')) return 'facebook'
  if (u.includes('x.com') || u.includes('twitter.com')) return 'x'
  return 'site'
}

export function keepItem(title) {
  const t = String(title || '')
  if (!t || t.length < 12) return false
  if (NOISE.test(t)) return false
  return INTENT.test(t) && PRIZE.test(t)
}

export function canonicalUrl(url) {
  try {
    const u = new URL(String(url))
    u.search = ''
    u.hash = ''
    return u.toString()
  } catch {
    return String(url || '')
  }
}

export function makeId(title, url) {
  return createHash('sha1').update(`${title}::${url}`).digest('hex').slice(0, 12)
}

export function normalize(item, source, now) {
  const title = cleanTitle(item.title)
  const url = canonicalUrl(item.link || item.url || '')
  const prize = detectTier(title)
  const language = detectLanguage(title, source.lang)
  const platform = detectPlatform(url)
  return {
    id: makeId(title, url),
    title,
    url,
    prize,
    platform,
    language,
    geo: detectGeo(title, url, source.lang),
    deadline: detectDeadline(title) || (item.isoDate ? new Date(item.isoDate).toISOString() : null),
    source: source.name || source.id,
    kind: 'auto',
    steps: STEPS[platform] || STEPS.site,
    discovered_at: now,
    seen_latest: now,
    image: item.enclosure?.url || undefined,
  }
}

async function fetchFeed(source) {
  const feed = await parser.parseURL(source.url)
  return feed.items || []
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function scrapeAll() {
  const { sources } = await readJson('sources.json', { sources: [] })
  const now = new Date().toISOString()
  const seen = new Map()
  const health = []

  for (const source of sources || []) {
    try {
      const items = await fetchFeed(source)
      let kept = 0
      for (const item of items) {
        const title = cleanTitle(item.title)
        if (!keepItem(title)) continue
        const entry = normalize(item, source, now)
        if (!entry.url || seen.has(entry.url)) continue
        seen.set(entry.url, entry)
        kept++
      }
      health.push({ id: source.id, name: source.name || source.id, last_ok: now, last_error: null, entries: kept })
    } catch (e) {
      health.push({ id: source.id, name: source.name || source.id, last_ok: null, last_error: String(e && e.message || e).slice(0, 200), entries: 0 })
    }
    await sleep(STAGGER_MS)
  }

  const previous = await readJson('feed.json', [])
  const prevById = new Map((Array.isArray(previous) ? previous : []).map((e) => [e.id, e]))
  const feed = [...seen.values()].map((e) => {
    const old = prevById.get(e.id)
    return old ? { ...e, discovered_at: old.discovered_at } : e
  })

  await writeJson('feed.json', feed)
  await writeJson('health.json', health)
  await writeJson('meta.json', { scraped_at: now })
  return { feed, sources: health, scraped_at: now }
}
