import express from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'
import cron from 'node-cron'
import { readJson, writeJson } from './util.js'
import { scrapeAll, normalize } from './scrape.js'
import { fetchOg } from './og.js'
import { hasSession, scanProfile, scanHashtag, fetchPost } from './instagram.js'

const SCRAPE_CRON = process.env.SCRAPE_CRON || '0 8,18 * * *'

async function autoScrape(reason) {
  try {
    const r = await scrapeAll()
    console.log(`[cron:${reason}] ${r.feed.length} entrées`)
  } catch (e) {
    console.error(`[cron:${reason}] échec:`, String((e && e.message) || e).slice(0, 200))
  }
}

if (process.env.GR_NO_LISTEN !== '1') {
  cron.schedule(SCRAPE_CRON, () => void autoScrape('cron'))

  const bootFeed = await readJson('feed.json', [])
  const bootMeta = await readJson('meta.json', {})
  const staleMs = Date.now() - Date.parse(bootMeta.scraped_at || 0)
  if (!Array.isArray(bootFeed) || bootFeed.length === 0 || Number.isNaN(staleMs) || staleMs > 6 * 3600 * 1000) {
    void autoScrape('boot')
  }
}

const app = express()
app.use(express.json({ limit: '256kb' }))

app.get('/api/health', async (_req, res) => {
  const feed = await readJson('feed.json', [])
  const meta = await readJson('meta.json', {})
  res.json({ ok: true, scraped_at: meta.scraped_at || null, entries: feed.length })
})

app.get('/api/feed', async (_req, res) => {
  const feed = await readJson('feed.json', [])
  const health = await readJson('health.json', [])
  const meta2 = await readJson('meta.json', {})
  const manual = await readJson('manual.json', [])
  const seen = new Set(feed.map((e) => e.url))
  const merged = [...feed]
  for (const m of manual) {
    if (m && m.url && !seen.has(m.url)) {
      seen.add(m.url)
      merged.push(m)
    }
  }
  res.json({ feed: merged, sources: health, scraped_at: meta2.scraped_at || null })
})

app.post('/api/scrape', async (_req, res) => {
  try {
    const result = await scrapeAll()
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e).slice(0, 300) })
  }
})

app.post('/api/og', async (req, res) => {
  const { url } = req.body || {}
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url requise' })
  try {
    res.json(await fetchOg(url))
  } catch (e) {
    res.status(502).json({ error: String((e && e.message) || e).slice(0, 200) })
  }
})

app.post('/api/ig', async (req, res) => {
  const { type, query, limit } = req.body || {}
  if (!hasSession()) return res.status(400).json({ error: 'IG_COOKIES non configuré (voir README)' })
  if ((type !== 'profile' && type !== 'hashtag') || !query) {
    return res.status(400).json({ error: 'type profile|hashtag + query requis' })
  }
  const now = new Date().toISOString()
  try {
    const urls = type === 'profile'
      ? await scanProfile(query, Math.min(Number(limit) || 8, 12))
      : await scanHashtag(query, Math.min(Number(limit) || 8, 12))
    const entries = []
    for (const url of urls) {
      try {
        const code = (url.match(/\/p\/([A-Za-z0-9_-]+)/) || [])[1]
        const post = await fetchPost(code)
        const entry = normalize({ title: post.description || post.title, link: url, isoDate: now }, { id: 'instagram', name: `Instagram ${type} ${query}`, lang: 'fr' }, now)
        entry.platform = 'instagram'
        if (post.image) entry.image = post.image
        entries.push(entry)
      } catch {
        /* post illisible : on passe */
      }
      await new Promise((r) => setTimeout(r, 1500))
    }
    res.json({ entries, count: entries.length })
  } catch (e) {
    res.status(502).json({ error: String((e && e.message) || e).slice(0, 300) })
  }
})

const MANUAL_SOURCE = { id: 'manual', name: 'Ajout manuel', lang: 'fr' }

app.post('/api/entries', async (req, res) => {
  const { url, platform, title: titleOverride, prizeTier } = req.body || {}
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url requise' })
  const now = new Date().toISOString()
  let og = {}
  try {
    og = await fetchOg(url)
  } catch {
    og = {}
  }
  const title = (titleOverride && String(titleOverride).trim()) || og.title || url
  const entry = normalize({ title, link: url, isoDate: now }, MANUAL_SOURCE, now)
  entry.kind = 'manual'
  if (platform && typeof platform === 'string') entry.platform = platform
  if (prizeTier && typeof prizeTier === 'string') entry.prize = { ...entry.prize, tier: prizeTier }
  if (og.image) entry.image = og.image
  const manual = await readJson('manual.json', [])
  const list = Array.isArray(manual) ? manual : []
  if (!list.some((m) => m.url === entry.url)) list.push(entry)
  await writeJson('manual.json', list)
  res.status(201).json(entry)
})

const dist = path.join(import.meta.dirname, '..', 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

export default app

const PORT = Number(process.env.PORT || 4000)
if (process.env.GR_NO_LISTEN !== '1') {
  app.listen(PORT, '0.0.0.0', () => console.log(`giftradar api on :${PORT}`))
}