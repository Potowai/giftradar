import type { Contest, FeedResponse } from './types'

export async function getFeed(): Promise<Contest[]> {
  try {
    const r = await fetch('/api/feed')
    if (!r.ok) return []
    const j = (await r.json()) as FeedResponse
    return Array.isArray(j.feed) ? j.feed : []
  } catch {
    return []
  }
}

export async function getFeedJson(): Promise<Contest[]> {
  return getFeed()
}