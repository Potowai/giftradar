import { describe, expect, it, beforeEach } from 'vitest'
import { emptyStore, entryProgress, loadStore, saveStore, STORE_KEY, toggleStep } from './store'

function stubStorage(initial?: Record<string, string>) {
  const data: Record<string, string> = { ...(initial ?? {}) }
  const storage = {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v
    },
    removeItem: (k: string) => {
      delete data[k]
    },
    clear: () => {
      for (const k of Object.keys(data)) delete data[k]
    },
    key: (i: number) => Object.keys(data)[i] ?? null,
    get length() {
      return Object.keys(data).length
    },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true })
  return data
}

beforeEach(() => {
  stubStorage()
})

describe('store', () => {
  it('starts empty when nothing is stored', () => {
    expect(loadStore()).toEqual({ v: 1, entries: {} })
  })

  it('round-trips through localStorage', () => {
    const data = stubStorage()
    const s = toggleStep(emptyStore(), 'abc', 'follow')
    saveStore(s)
    expect(JSON.parse(data[STORE_KEY]).entries.abc.steps).toEqual({ follow: true })
    expect(loadStore().entries.abc.steps).toEqual({ follow: true })
  })

  it('marks entered only when every touched step is done', () => {
    let s = emptyStore()
    s = toggleStep(s, 'abc', 'follow')
    expect(s.entries.abc.entered).toBe(true)
    s = toggleStep(s, 'abc', 'like')
    expect(s.entries.abc.entered).toBe(true)
    s = toggleStep(s, 'abc', 'like')
    expect(s.entries.abc.entered).toBe(false)
    expect(s.entries.abc.steps).toEqual({ follow: true, like: false })
  })

  it('recovers from corrupted storage', () => {
    stubStorage({ [STORE_KEY]: 'not-json{{{' })
    expect(loadStore()).toEqual({ v: 1, entries: {} })
  })

  it('computes progress per entry', () => {
    let s = emptyStore()
    s = toggleStep(s, 'abc', 'follow')
    expect(entryProgress(s, 'abc', ['follow', 'like'])).toEqual({ done: 1, total: 2 })
  })
})
