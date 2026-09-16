import express from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { readJson, dataPath } from './util.js'
import { scrapeAll } from './scrape.js'

const app = express()
app.use(express.json({ limit: '256kb' }))

app.get('/api/health', async (_req, res) => {
  const feed = await readJson('feed.json', [])
  res.json({ ok: true, scraped_at: null, entries: feed.length })
})

app.get('/api/feed', async (_req, res) => {
  const feed = await readJson('feed.json', [])
  const health = await readJson('health.json', [])
  res.json({ feed, health, scraped_at: null })
})

app.post('/api/scrape', async (_req, res) => {
  const result = await scrapeAll()
  res.json(result)
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