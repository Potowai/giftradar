import { load } from 'cheerio'

const UA = process.env.USER_AGENT || 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
const TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 12000)

function cookies() {
  return process.env.IG_COOKIES || ''
}

export function hasSession() {
  return cookies().includes('sessionid=')
}

async function fetchIg(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        Cookie: cookies(),
      },
      redirect: 'follow',
    })
    if (!r.ok) throw new Error(`instagram http ${r.status}`)
    return await r.text()
  } finally {
    clearTimeout(timer)
  }
}

export function extractShortcodes(html) {
  const found = new Set()
  const re = /\/(p|reel|reels)\/([A-Za-z0-9_-]{6,15})\/?/g
  let m
  const s = String(html || '')
  while ((m = re.exec(s)) !== null) found.add(m[2])
  return [...found]
}

export function parsePostOg(html, url) {
  const $ = load(String(html || ''))
  const meta = (p) => ($(`meta[property="${p}"]`).attr('content') || '').trim()
  const title = meta('og:title')
  const description = meta('og:description')
  const image = meta('og:image')
  const pageTitle = $('title').first().text()
  if (!description && /log\s?in|connexion/i.test(`${title} ${pageTitle}`)) return null
  return { title: title || 'Post Instagram', description: description || undefined, image: image || undefined }
}

export async function fetchPost(shortcode) {
  const url = `https://www.instagram.com/p/${shortcode}/`
  const html = await fetchIg(url)
  const og = parsePostOg(html, url)
  if (!og) throw new Error('login wall ou post inaccessible')
  return { url, ...og }
}

export async function scanProfile(username, limit = 12) {
  const clean = String(username || '').replace(/^@/, '').trim()
  if (!clean) throw new Error('pseudo vide')
  const html = await fetchIg(`https://www.instagram.com/${clean}/`)
  if (/<title>\s*Instagram\s*<\/title>/i.test(html) && !/og:description/i.test(html)) {
    throw new Error('session invalide (mur de login) — vérifie IG_COOKIES')
  }
  return extractShortcodes(html).slice(0, limit).map((code) => `https://www.instagram.com/p/${code}/`)
}

export async function scanHashtag(tag, limit = 12) {
  const clean = String(tag || '').replace(/^#/, '').trim()
  if (!clean) throw new Error('hashtag vide')
  const html = await fetchIg(`https://www.instagram.com/explore/tags/${encodeURIComponent(clean)}/`)
  if (/<title>\s*Instagram\s*<\/title>/i.test(html) && !/og:description/i.test(html)) {
    throw new Error('session invalide (mur de login) — vérifie IG_COOKIES')
  }
  return extractShortcodes(html).slice(0, limit).map((code) => `https://www.instagram.com/p/${code}/`)
}
