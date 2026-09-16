export const STORE_KEY = 'gr:v1'

export interface Entry {
  entered: boolean
  enteredAt?: string
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
  const entered = Object.keys(steps).length > 0 && Object.values(steps).every(Boolean)
  return { ...s, entries: { ...s.entries, [id]: { ...e, steps, entered } } }
}

export function entryProgress(s: Store, id: string, labels: string[]): { done: number; total: number } {
  const e = s.entries[id]
  const done = labels.filter((l) => e?.steps?.[l]).length
  return { done, total: labels.length }
}
