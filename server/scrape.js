import { createHash } from 'node:crypto'
import Parser from 'rss-parser'
import { load } from 'cheerio'
import { readJson, writeJson } from './util.js'

const UA = process.env.USER_AGENT || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36'
const TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 12000)
const STAGGER_MS = 2500

const parser = new Parser({ timeout: TIMEOUT_MS, headers: { 'User-Agent': UA } })

const INTENT = /gagn|win|giveaway|concours|jeu\b|tentez|remport|enter to win|chance|lot|tirage|quiz|sweepstake/i
const PRIZE = /iphone|apple|ipad|airpods|macbook|watch|ios/i
const NOISE = /retrouv|volé|volée|procès|arrêté|interpellé|escroquerie|arnaque|fake|mort|décès|slammed|slam\b|staging|staged|buys?\s+\d+|bought\s+\d+|lawsuit|sues?\b|arrest/i

export function titleKey(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[\s_]+/g, ' ')
    .replace(/\s*[–—\-|:]\s*[^-–—|:]{1,40}$/, '')
    .replace(/[^a-z0-9àâäéèêëîïôöùûüç ]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}
const FINISHED = /\[terminé\]|\(terminé\)|\*terminé[es]?\*|\bterminé[es]?\b\s*[:!.–—-]*$|has ended|have ended|\bended\b|\bclosed\b|expired|winners?\s+announced|gagnants?\s+annoncé|résultats?\s+(connus|dévoilés|disponibles)|tirage\s+effectué/i
const STALE_DAYS = 60
const DROP_DAYS = 180

const TIER_18 = /iphone\s*1\s*8|iphone\s*eighteen/i
const TIER_17 = /iphone\s*1\s*7|iphone\s*seventeen/i
const APPLE_OTHER = /apple|ipad|airpods|macbook|watch|app\s*store|itunes|ios/i

const GEO_NANTES = /nantes|loire-atlantique|\b44\b|pays de la loire/i
const GEO_FR = /france|français|francais|métropole|metropole|\.fr\b|paris|lyon|marseille|bordeaux|lille|toulouse/i
const GEO_EU = /europe|european|e\.u\.|\beu\b|belgique|suisse|espagne|italie|allemagne/i

const DEADLINE = /(?:ends?|closes?|deadline|fin|clôture|cloture|jusqu'au|avant le)\s*[:–-]?\s*([0-3]?\d(?:er)?\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+[0-3]?\d(?:st|nd|rd|th)?,?\s+\d{4})/i

const MONTHS = {
  janvier: 1, fevrier: 2, 'février': 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, 'août': 8, septembre: 9, octobre: 10, novembre: 11,
  decembre: 12, 'décembre': 12, janv: 1, fevr: 2, 'févr': 2, avr: 4, juil: 7,
  sept: 9, oct: 10, nov: 11, dec: 12, 'déc': 12,
}

const RISK = /frais de port|participation payante|numéro surtaxé|numero surtaxé|0 899|08 9\d|telegram|whatsapp|coordonnées bancaires|coordonnees bancaires|\biban\b|reconditionné\b.*iphone\s*x\b|iphone\s*x\b.*reconditionné/i

export function detectRisk(title) {
  return RISK.test(String(title || ''))
}

export function parseFrDate(day, monthWord, year) {
  const m = MONTHS[String(monthWord || '').toLowerCase()]
  const d = Number(day)
  const y = Number(year)
  if (!m || !d || !y) return null
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return dt.toISOString()
}

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
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&euro;|&#8364;/gi, '€')
    .replace(/&[a-z]+;/gi, ' ')
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
  const t = String(title || '')
  const slash = t.match(/(\b\d{2})\/(\d{2})\/(20\d{2}\b)/)
  if (slash) {
    const dt = new Date(Date.UTC(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1])))
    if (!Number.isNaN(dt.getTime())) return dt.toISOString()
  }
  const m = t.match(DEADLINE)
  if (!m) return null
  const d = new Date(m[1])
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function slugDate(slug) {
  const m = String(slug || '')
    .toLowerCase()
    .match(/jusqu-au-(\d{1,2})-([a-zéû]+)-(\d{4})/)
  if (!m) return null
  return parseFrDate(m[1], m[2], m[3])
}

export function slugPlatform(slug) {
  const s = String(slug || '').toLowerCase()
  if (s.includes('sur-instagram') || s.includes('-instagram-') || s.includes('concours-instagram-')) return 'instagram'
  if (s.includes('sur-facebook') || s.includes('-facebook-') || s.includes('concours-facebook-')) return 'facebook'
  if (s.includes('tiktok')) return 'tiktok'
  if (s.includes('youtube')) return 'youtube'
  return 'site'
}

export function detectPlatform(url, title = '') {
  const u = String(url || '').toLowerCase()
  const t = String(title || '')
  if (u.includes('instagram.com')) return 'instagram'
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  if (u.includes('tiktok.com')) return 'tiktok'
  if (u.includes('facebook.com')) return 'facebook'
  if (u.includes('x.com') || u.includes('twitter.com')) return 'x'
  if (/\s-\s(x\.com|twitter)\.?$/i.test(t) || /follow @\w+.*\b(RT|repost)\b/i.test(t)) return 'x'
  return 'site'
}

export function isFinished(title) {
  return FINISHED.test(String(title || ''))
}

export function keepItem(title) {
  const t = String(title || '')
  if (!t || t.length < 12) return false
  if (NOISE.test(t)) return false
  if (isFinished(t)) return false
  return INTENT.test(t) && PRIZE.test(t)
}

export function ageDays(pubIso, nowMs) {
  if (!pubIso) return null
  const t = Date.parse(pubIso)
  if (Number.isNaN(t)) return null
  return (nowMs - t) / 86400000
}

export function isStale(pubIso, nowMs) {
  const a = ageDays(pubIso, nowMs)
  return a !== null && a > STALE_DAYS
}

export function isAncient(pubIso, nowMs) {
  const a = ageDays(pubIso, nowMs)
  return a !== null && a > DROP_DAYS
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
  const platform = item.platform || detectPlatform(url, title)
  const deadline = item.deadline || detectDeadline(title)
  return {
    id: makeId(title, url),
    title,
    url,
    prize,
    platform,
    language,
    geo: detectGeo(title, url, source.lang),
    deadline,
    published: item.isoDate ? new Date(item.isoDate).toISOString() : null,
    stale: !deadline && isStale(item.isoDate, Date.parse(now)),
    risk: detectRisk(title),
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

async function fetchHtml(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA, Accept: 'text/html' } })
    if (!r.ok) throw new Error(`http ${r.status}`)
    return load(await r.text())
  } finally {
    clearTimeout(timer)
  }
}

function prettySlug(slug) {
  return String(slug || '')
    .replace(/\.php$|\.html$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/iphone/gi, 'iPhone')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseDemonJeu($, base) {
  const out = []
  $('article[id^="article-concours-id-"]').each((_, el) => {
    const $el = $(el)
    const org = $el.find('[data-concours-nom]').attr('data-concours-nom') || ''
    $el.find('a[href$=".php"]').each((__, a) => {
      const href = $(a).attr('href') || ''
      if (!/iphone|ipad|airpods|watch|macbook|apple/i.test(href)) return
      const slug = href.split('/').pop()
      const prizePart = (slug.match(/gagnez-(.+?)(?:-sur-|-jusqu-au-|\.php)/i) || [])[1] || 'iPhone'
      out.push({
        title: `Gagnez ${prettySlug(prizePart)} (${org})`.slice(0, 140),
        link: new URL(href, base).toString(),
        isoDate: null,
        platform: slugPlatform(slug),
        deadline: slugDate(slug),
      })
    })
  })
  return out
}

export function parseJcb($, base, now) {
  const out = []
  $('article[id^="fiche-concours-"]').each((_, el) => {
    const $el = $(el)
    const href = $el.find('a.concours-id[href*="iphone"]').attr('href')
    if (!href) return
    const org = $el.find('h3.concours-title a').first().text().trim() || 'Influenceur'
    const text = $el.text().replace(/\s+/g, ' ')
    let deadline = null
    const abs = text.match(/(?:se termine(?:ront)?(?: le)?|fin(?: le)?)\s*(?:\w+\s+)?(\d{2}\/\d{2}\/20\d{2})/i)
    if (abs) {
      const [, d, m, y] = abs[0].match(/(\d{2})\/(\d{2})\/(20\d{2})/)
      deadline = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).toISOString()
    } else {
      const rel = text.match(/dans (\d+) jours?/i)
      if (rel) deadline = new Date(Date.parse(now) + Number(rel[1]) * 86400000).toISOString()
    }
    const added = text.match(/ajouté le (\d{2}\/\d{2}\/20\d{2})/i)
    let published = null
    if (added) {
      const [, d, m, y] = added[0].match(/(\d{2})\/(\d{2})\/(20\d{2})/)
      published = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).toISOString()
    }
    const slug = href.split('/').pop()
    out.push({
      title: `Concours ${org} : ${prettySlug(slug.replace(/^concours-(instagram|facebook|tiktok|youtube)-/, ''))}`.slice(0, 140),
      link: new URL(href, base).toString(),
      isoDate: published,
      platform: slugPlatform(href),
      deadline,
    })
  })
  return out
}

export function parseCdn($, base, now) {
  const out = []
  $('article.concours-card').each((_, el) => {
    const $el = $(el)
    const a = $el.find('a[href^="/jeu-concours-"]').first()
    const href = a.attr('href') || ''
    const label = a.attr('aria-label') || ''
    if (!/iphone/i.test(label + ' ' + href)) return
    const text = $el.text().replace(/\s+/g, ' ')
    const title = (label.replace(/^Voir la fiche du concours\s*/i, '') || 'Concours').slice(0, 140)
    let deadline = null
    const fin = text.match(/Fin le (\d{2})\/(\d{2})\/(20\d{2})/i)
    if (fin) deadline = new Date(Date.UTC(Number(fin[3]), Number(fin[2]) - 1, Number(fin[1]))).toISOString()
    let published = null
    const pub = text.match(/Publié il y a (\d+) jours?/i)
    if (pub) published = new Date(Date.parse(now) - Number(pub[1]) * 86400000).toISOString()
    const platform = /instagram/i.test(text) ? 'instagram' : /facebook/i.test(text) ? 'facebook' : 'site'
    out.push({ title, link: new URL(href, base).toString(), isoDate: published, platform, deadline })
  })
  return out
}

export function parseTg(html, base) {
  const out = []
  const parts = String(html || '').split(/(<a[^>]*href="\/concours\/g\d+\.html"[^>]*>)/i)
  for (let i = 1; i < parts.length; i += 2) {
    const linkTag = parts[i]
    const after = parts[i + 1] || ''
    const before = parts[i - 1] || ''
    const href = (linkTag.match(/href="([^"]+)"/i) || [])[1]
    if (!href) continue
    const lots = [...before.matchAll(/<p class="lots">(.*?)<\/p>/gis)].pop()
    const lotsText = (lots ? lots[1].replace(/<[^>]+>/g, ' ') : '').replace(/\s+/g, ' ').trim()
    if (!/iphone/i.test(lotsText)) continue
    const fin = (after.match(/termines-le-(\d{2})-(\d{2})-(20\d{2})\.html/i) || [])
    const deadline = fin[1] ? new Date(Date.UTC(Number(fin[3]), Number(fin[2]) - 1, Number(fin[1]))).toISOString() : null
    const added = (before.match(/ajoutes-le-(\d{2})-(\d{2})-(20\d{2})\.html/i) || [])
    const published = added[1] ? new Date(Date.UTC(Number(added[3]), Number(added[2]) - 1, Number(added[1]))).toISOString() : null
    const plat = (after.match(/title="Jeu-concours sur ([^.]+)\./i) || [])[1] || ''
    const platform = /instagram/i.test(plat) ? 'instagram' : /facebook/i.test(plat) ? 'facebook' : /twitter/i.test(plat) ? 'x' : 'site'
    const firstLot = lotsText.replace(/^Au tirage au sort\s*:\s*/i, '').split(/[,;]/)[0].trim().slice(0, 80)
    out.push({
      title: `Gagnez ${firstLot} (ToutGagner)`.slice(0, 140),
      link: new URL(href, base).toString(),
      isoDate: published,
      platform,
      deadline,
    })
  }
  return out
}

const HTML_PARSERS = { ddj: parseDemonJeu, jcb: parseJcb, cdn: parseCdn, tg: ($, base) => parseTg($.html(), base) }

export function rewriteTgEntry(e) {
  const core = String(e.title || '').replace(/\s*\(ToutGagner\)\s*$/i, '').trim()
  e.fiche = e.url
  e.url = `https://www.google.com/search?q=${encodeURIComponent(`"${core}" concours gagner`)}`
  e.id = makeId(e.title, e.url)
  return e
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function scrapeAll() {
  const { sources } = await readJson('sources.json', { sources: [] })
  const now = new Date().toISOString()
  const seen = new Map()
  const health = []

  const rankOf = (id) => {
    if (/^(ddj|jcb|cdn)/.test(id)) return 5
    if (/^gn-/.test(id)) return 4
    if (/^rd-/.test(id)) return 3
    if (/^tg-/.test(id)) return 2
    return 1
  }

  const seenTitles = new Map()
  for (const source of sources || []) {
    try {
      let items
      if (source.type === 'html' && HTML_PARSERS[source.parser]) {
        const $ = await fetchHtml(source.url)
        items = HTML_PARSERS[source.parser]($, source.url, now).map((r) => ({
          title: r.title,
          link: r.url || r.link,
          isoDate: r.isoDate,
          platform: r.platform,
          deadline: r.deadline,
        }))
      } else {
        items = await fetchFeed(source)
      }
      let kept = 0
      const rank = rankOf(source.id)
      for (const item of items) {
        const title = cleanTitle(item.title)
        if (!keepItem(title)) continue
        const entry = normalize(item, source, now)
        if (!entry.url) continue
        if (seen.has(entry.url)) continue
        const dkey = `${entry.prize.tier}|${(entry.published || '').slice(0, 10)}|${titleKey(title).slice(0, 25)}`
        const prev = seenTitles.get(dkey)
        if (prev && prev.rank >= rank) continue
        if (prev) seen.delete(prev.url)
        seenTitles.set(dkey, { rank, url: entry.url })
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
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)
  const feed = [...seen.values()]
    .filter((e) => {
      if (!e.deadline) return !isAncient(e.published, Date.parse(now))
      const d = Date.parse(e.deadline)
      return Number.isNaN(d) || d >= todayStart.getTime()
    })
    .map((e) => {
      if (e.source && /toutgagner/i.test(e.source)) rewriteTgEntry(e)
      const old = prevById.get(e.id)
      return old ? { ...e, discovered_at: old.discovered_at } : e
    })

  await writeJson('feed.json', feed)
  await writeJson('health.json', health)
  await writeJson('meta.json', { scraped_at: now })
  return { feed, sources: health, scraped_at: now }
}
