import { load } from 'cheerio'

const UA = process.env.USER_AGENT || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36'
const TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 12000)

export function parseOg(html, url) {
  const $ = load(String(html || ''))
  const meta = (sel) => ($(`meta[property="${sel}"]`).attr('content') || $(`meta[name="${sel}"]`).attr('content') || '').trim()
  const title = meta('og:title') || $('title').first().text().trim()
  const image = meta('og:image')
  const description = meta('og:description') || meta('description')
  let fallback = ''
  try {
    const u = new URL(String(url))
    fallback = `${u.hostname.replace(/^www\./, '')} ${u.pathname.replace(/\/+/g, ' ').trim()}`.trim()
  } catch {
    fallback = String(url || 'Lien manuel')
  }
  return {
    title: title || fallback || 'Lien manuel',
    image: image || undefined,
    description: description || undefined,
  }
}

export async function fetchOg(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const headers = { 'User-Agent': UA, Accept: 'text/html' }
    try {
      if (new URL(String(url)).hostname.includes('instagram.com') && process.env.IG_COOKIES) {
        headers.Cookie = process.env.IG_COOKIES
      }
    } catch { /* url invalide */ }
    const r = await fetch(String(url), {
      signal: ctrl.signal,
      headers,
      redirect: 'follow',
    })
    if (!r.ok) throw new Error(`http ${r.status}`)
    const html = await r.text()
    return parseOg(html.slice(0, 300000), url)
  } finally {
    clearTimeout(timer)
  }
}
