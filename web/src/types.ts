export type PrizeTier = 'iphone-18' | 'iphone-17' | 'apple' | 'other'

export type Platform = 'site' | 'instagram' | 'youtube' | 'tiktok' | 'facebook' | 'x'

export type Language = 'fr' | 'en' | 'other'

export type GeoScope = 'nantes' | 'fr' | 'eu' | 'world' | 'unknown'

export interface ContestStep {
  label: string
  optional?: boolean
}

export interface Geo {
  scope: GeoScope
  note?: string
}

export interface Prize {
  name: string
  tier: PrizeTier
}

export interface Contest {
  id: string
  title: string
  url: string
  prize: Prize
  platform: Platform
  language: Language
  geo: Geo
  deadline: string | null
  source: string
  kind: 'auto' | 'manual'
  steps: ContestStep[]
  discovered_at: string
  seen_latest: string
  image?: string
  stale?: boolean
  published?: string | null
  risk?: boolean
  fiche?: string
}

export interface StateEntry {
  entered: boolean
  entered_at?: string
  per_step: Record<string, boolean>
  reported?: boolean
}

export interface AppState {
  version: number
  entries: Record<string, StateEntry>
}

export interface SourceHealth {
  id: string
  name: string
  last_ok: string | null
  last_error: string | null
  entries: number
}

export interface FeedResponse {
  feed: Contest[]
  sources: SourceHealth[]
  scraped_at: string | null
}