import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { scanProfile, scanHashtag, fetchPost, hasSession } from '../server/instagram.js'

const SNAP = path.join(import.meta.dirname, '..', 'web', 'public', 'feed.snapshot.json')
const WATCH = path.join(import.meta.dirname, '..', 'server', 'data', 'ig-watch.json')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

if (!hasSession()) {
  console.log('scrape-ig: pas de IG_COOKIES, étape ignorée')
  process.exit(0)
}

const watch = JSON.parse(await readFile(WATCH, 'utf8'))
const limit = Number(watch.per_source_limit || 6)

let snapshot = { feed: [], sources: [], scraped_at: null }
try {
  snapshot = JSON.parse(await readFile(SNAP, 'utf8'))
} catch {
  /* premier run */
}
if (!Array.isArray(snapshot.feed)) snapshot.feed = []
if (!Array.isArray(snapshot.sources)) snapshot.sources = []

const seen = new Set(snapshot.feed.map((e) => e.url))
const { normalize, keepItem, cleanTitle } = await import('../server/scrape.js')
const now = new Date().toISOString()
const added = []
const errors = []

async function handleUrls(urls, sourceName) {
  for (const url of urls) {
    try {
      const code = (url.match(/\/p\/([A-Za-z0-9_-]+)/) || [])[1]
      if (!code) continue
      const post = await fetchPost(code)
      const title = cleanTitle(`${post.description || post.title || ''}`.slice(0, 200))
      if (!keepItem(title)) continue
      const entry = normalize({ title, link: url, isoDate: now }, { id: 'instagram', name: sourceName, lang: 'fr' }, now)
      entry.platform = 'instagram'
      if (post.image) entry.image = post.image
      if (!entry.url || seen.has(entry.url)) continue
      seen.add(entry.url)
      snapshot.feed.push(entry)
      added.push(entry.title.slice(0, 60))
    } catch (e) {
      errors.push(String((e && e.message) || e).slice(0, 80))
    }
    await sleep(1500)
  }
}

for (const tag of watch.hashtags || []) {
  try {
    await handleUrls(await scanHashtag(tag, limit), `Instagram #${tag}`)
  } catch (e) {
    errors.push(`#${tag}: ${String((e && e.message) || e).slice(0, 80)}`)
  }
}
for (const profile of watch.profiles || []) {
  try {
    await handleUrls(await scanProfile(profile, limit), `Instagram @${profile}`)
  } catch (e) {
    errors.push(`@${profile}: ${String((e && e.message) || e).slice(0, 80)}`)
  }
}

await writeFile(SNAP, JSON.stringify(snapshot))
console.log(`scrape-ig: +${added.length} entrées IG (${snapshot.feed.length} total)`)
if (errors.length) console.log('notes:', [...new Set(errors)].slice(0, 5).join(' | '))
