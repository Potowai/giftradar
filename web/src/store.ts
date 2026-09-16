export const STORE_KEY = 'gr:v1'

export interface Entry {
  entered: boolean
  enteredAt?: string
  openedAt?: string
  steps: Record<string, boolean>
}

export interface Store {
  v: number
  entries: Record<string, Entry>
}

export function emptyStore(): Store {
  return { v: 1, entries: {} }
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Store>
      if (parsed && typeof parsed === 'object' && parsed.entries && typeof parsed.entries === 'object') {
        return { v: 1, entries: parsed.entries as Record<string, Entry> }
      }
    }
  } catch {
    /* corrupted storage -> start fresh */
  }
  return emptyStore()
}

export function saveStore(s: Store): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(s))
}

export function toggleStep(s: Store, id: string, step: string): Store {
  const e: Entry = s.entries[id] ?? { entered: false, steps: {} }
  const steps = { ...e.steps, [step]: !e.steps[step] }
  const allDone = Object.keys(steps).length > 0 && Object.values(steps).every(Boolean)
  const entered = !!e.openedAt || allDone
  return { ...s, entries: { ...s.entries, [id]: { ...e, steps, entered } } }
}

export function markOpened(s: Store, id: string): Store {
  const e: Entry = s.entries[id] ?? { entered: false, steps: {} }
  const now = new Date().toISOString()
  return { ...s, entries: { ...s.entries, [id]: { ...e, entered: true, enteredAt: now, openedAt: now } } }
}

export function unmark(s: Store, id: string): Store {
  const e: Entry = s.entries[id] ?? { entered: false, steps: {} }
  const { openedAt: _drop, enteredAt: _drop2, ...rest } = e
  void _drop
  void _drop2
  return { ...s, entries: { ...s.entries, [id]: { ...rest, entered: false, steps: {} } } }
}

export function entryProgress(s: Store, id: string, labels: string[]): { done: number; total: number } {
  const e = s.entries[id]
  const done = labels.filter((l) => e?.steps?.[l]).length
  return { done, total: labels.length }
}
