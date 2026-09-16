import { scrapeAll } from '../server/scrape.js'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const out = path.join(import.meta.dirname, '..', 'web', 'public', 'feed.snapshot.json')

try {
  const result = await scrapeAll()
  await mkdir(path.dirname(out), { recursive: true })
  const snapshot = { feed: result.feed, sources: result.sources, scraped_at: result.scraped_at }
  await writeFile(out, JSON.stringify(snapshot))
  console.log(`snapshot: ${result.feed.length} entries -> ${out}`)
} catch (e) {
  console.error('snapshot failed:', String((e && e.message) || e).slice(0, 300))
  process.exit(1)
}
