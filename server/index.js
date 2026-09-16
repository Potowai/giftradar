import express from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { readJson, writeJson } from './util.js'
import { scrapeAll, normalize } from './scrape.js'
import { fetchOg } from './og.js'

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