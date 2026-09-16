import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Checkbox, Dialog, Empty, Input, NavBar, ProgressBar, PullToRefresh, SearchBar, Selector, Space, TabBar, Toast, Badge } from 'antd-mobile'
import { Contest, GeoScope, Platform } from './types'
import { loadStore, markOpened, saveStore, Store, toggleStep, unmark } from './store'

let sample: Contest[] = []
let sampleLoaded = false

const LOCAL_MANUAL_KEY = 'gr:manual'

function hashId(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h.toString(16).padStart(8, '0')
}

function loadLocalManual(): Contest[] {
  try {
    const raw = localStorage.getItem(LOCAL_MANUAL_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch { return [] }
}

function saveLocalManual(list: Contest[]) {
  try { localStorage.setItem(LOCAL_MANUAL_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

async function getFeed(): Promise<Contest[]> {
  if (sampleLoaded) return sample
  const local = loadLocalManual()
  try {
    const r = await fetch('/api/feed')
    if (!r.ok) throw new Error('api')
    const j = await r.json()
    const list: Contest[] = Array.isArray(j.feed) ? j.feed : []
    sample = [...local, ...list.filter(c => !local.some(l => l.url === c.url))]
    sampleLoaded = true
    return sample
  } catch { /* static hosting : snapshot embarqué */ }
  try {
    const r = await fetch('feed.snapshot.json')
    const j = await r.json()
    const list: Contest[] = Array.isArray(j.feed) ? j.feed : []
    sample = [...local, ...list.filter(c => !local.some(l => l.url === c.url))]
    sampleLoaded = true
    return sample
  } catch { return [...local, ...sample] }
}

async function refreshFeed(): Promise<Contest[]> {
  sampleLoaded = false
  sample = []
  return getFeed()
}

async function postEntry(url: string): Promise<{ ok: boolean; title?: string; local?: boolean }> {
  try {
    const r = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, platform: 'instagram' }),
    })
    if (!r.ok) throw new Error('api')
    const j = await r.json()
    return { ok: true, title: j.title }
  } catch { /* static : entrée 100% locale */ }
  try {
    const now = new Date().toISOString()
    const entry: Contest = {
      id: 'm' + hashId(url),
      title: url,
      url,
      prize: { name: 'Concours (lien)', tier: 'other' },
      platform: 'instagram',
      language: 'fr',
      geo: { scope: 'unknown' },
      deadline: null,
      source: 'Ajout manuel',
      kind: 'manual',
      steps: [{ label: 'Ouvrir et participer' }],
      discovered_at: now,
      seen_latest: now,
    }
    const local = loadLocalManual()
    if (!local.some(l => l.url === url)) {
      local.push(entry)
      saveLocalManual(local)
    }
    sampleLoaded = false
    return { ok: true, title: 'lien enregistré (local)', local: true }
  } catch {
    return { ok: false }
  }
}

const GEO_LABEL: Record<GeoScope, string> = { nantes: 'Nantes', fr: 'France', eu: 'Europe', world: 'Monde', unknown: '?' }
const PLATFORM_LABEL: Record<Platform, string> = { instagram: 'IG', youtube: 'YT', tiktok: 'TT', site: 'Site', facebook: 'FB', x: 'X' }

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
}

function countdown(d: number | null): string {
  if (d == null) return '—'
  return d < 0 ? 'fini' : d <= 7 ? `J-${d}` : `${d} j`
}

export function App() {
  const [contests, setContests] = useState<Contest[]>([])
  const [store, setStore] = useState<Store>(loadStore)
  const [q, setQ] = useState('')
  const [geo, setGeo] = useState<GeoScope | ''>('')
  const [hideDone, setHideDone] = useState(false)
  const [showStale, setShowStale] = useState(false)
  const [tab, setTab] = useState('open')
  const [addOpen, setAddOpen] = useState(false)
  const [url, setUrl] = useState('')

  useEffect(() => { getFeed().then(setContests) }, [])

  const save = (s: Store) => { setStore(s); saveStore(s) }

  const toggle = (id: string, step: string) => {
    save(toggleStep(store, id, step))
  }

  const isDone = (c: Contest) => !!store.entries[c.id]?.entered

  const openLink = (c: Contest) => {
    save(markOpened(store, c.id))
    Toast.show({ content: 'Marqué comme fait ✓', duration: 1500 })
    window.open(c.url, '_blank')
  }

  const staleCount = useMemo(() => contests.filter(c => c.stale).length, [contests])

  const filtered = useMemo(() =>
    contests
      .filter(c => showStale || !c.stale)
      .filter(c => !geo || c.geo.scope === geo)
      .filter(c => !q || (c.title + ' ' + c.prize.name).toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) =>
        (Number(!!a.stale) - Number(!!b.stale)) ||
        ((daysUntil(a.deadline) ?? 999) - (daysUntil(b.deadline) ?? 999)),
      ),
    [contests, geo, q, showStale],
  )

  const undone = useMemo(() => filtered.filter(c => !isDone(c)), [filtered, store])
  const done = useMemo(() => filtered.filter(c => isDone(c)), [filtered, store])

  const visible = useMemo(() => {
    const list = tab === 'done' ? done : undone
    return hideDone ? list.filter(c => !isDone(c)) : list
  }, [tab, done, undone, hideDone, store])

  const doAdd = async () => {
    const u = url.trim()
    if (!u) return
    setAddOpen(false)
    setUrl('')
    Toast.show({ content: 'Ajout en cours…', duration: 1200 })
    const r = await postEntry(u)
    if (r.ok) {
      const fresh = await refreshFeed()
      setContests(fresh)
      Toast.show({ content: `Ajouté : ${(r.title || 'concours').slice(0, 40)}`, duration: 2000 })
    } else {
      Toast.show({ content: 'Échec — réessaie (serveur joignable ?)', duration: 2000 })
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh', background: '#0b1020', color: '#eef1f8' }}>
      <NavBar back={null} style={{ background: '#111830' }} right={<Badge content={undone.length}><Button size="mini" color="primary" onClick={() => setAddOpen(true)}>+ AJOUTER</Button></Badge>}>GiftRadar</NavBar>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 8 }}>
        <div style={{ flex: 1 }}><SearchBar placeholder="recherche (iPhone 17, Air…)" value={q} onChange={setQ} /></div>
        <Button size="small" fill={hideDone ? 'solid' : 'outline'} color="primary" onClick={() => setHideDone(!hideDone)}>Faits</Button>
      </div>

      {staleCount > 0 && (
        <div style={{ margin: '0 8px 4px' }}>
          <Button block fill="outline" size="mini" onClick={() => setShowStale(!showStale)}>
            {showStale ? 'Masquer les douteux' : `Afficher ${staleCount} douteux (à vérifier) ⚠`}
          </Button>
        </div>
      )}

      <Selector
        options={[
          { label: 'Tous', value: '' }, { label: 'Nantes', value: 'nantes' },
          { label: 'France', value: 'fr' }, { label: 'Europe', value: 'eu' },
          { label: 'Monde', value: 'world' },
        ]}
        value={[geo]}
        onChange={(v) => setGeo(v[0] ?? '')}
        style={{ padding: 8 }}
      />

      <TabBar activeKey={tab} onChange={setTab} style={{ position: 'sticky', bottom: 0, background: '#111830' }}>
        <TabBar.Item key="open" title={`À faire (${undone.length})`} icon={<span>✓</span>} />
        <TabBar.Item key="done" title={`Terminés (${done.length})`} icon={<span>☑</span>} />
      </TabBar>

      {visible.length === 0 && <Empty description="Rien en ce moment — relance le scan." style={{ padding: 48 }} />}

      <PullToRefresh onRefresh={async () => { setContests(await refreshFeed()) }}>
      <Space direction="vertical" block style={{ padding: '0 0 64px' }}>
        {visible.map(c => {
          const st = store.entries[c.id]
          const doneSteps = c.steps.filter(s => st?.steps?.[s.label]).length
          const pct = c.steps.length ? (doneSteps / c.steps.length) * 100 : 0
          return (
            <Card
              key={c.id}
              style={{ margin: 8, background: '#151c34', borderRadius: 14, border: '1px solid #232b42' }}
              title={c.prize.name}
                extra={<Space wrap><Badge color="#7b2ff7" content={PLATFORM_LABEL[c.platform]} /><Badge color={c.geo.scope === 'world' ? '#3ddc97' : '#ff4d6d'} content={GEO_LABEL[c.geo.scope]} />{c.risk ? <Badge color="#ff8c00" content="vigilance" /> : null}</Space>}
            >
                <b>{c.title}</b>
                <div style={{ opacity: 0.6, fontSize: 13, marginTop: 4 }}>échéance : {countdown(daysUntil(c.deadline))} · {c.language === 'fr' ? 'FR' : c.language === 'en' ? 'EN' : '?'} · pas de participation (Instagram/Site){c.stale ? ' · ⚠ à vérifier' : ''}</div>
                {c.steps.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <Space style={{ width: '100%', marginBottom: 6 }} align="center">
                      <ProgressBar percent={pct} style={{ flex: 1 }} />
                      <span style={{ fontSize: 12, opacity: 0.7 }}>{doneSteps}/{c.steps.length}</span>
                    </Space>
                    {c.steps.map(s => (
                      <div key={s.label}>
                        <Checkbox checked={!!st?.steps?.[s.label]} onChange={() => toggle(c.id, s.label)}>{s.label}</Checkbox>
                      </div>
                    ))}
                  </div>
                )}
                {tab === 'done' ? (
                  <Button block fill="outline" size="small" style={{ marginTop: 10 }} onClick={() => save(unmark(store, c.id))}>Remettre à faire ↩</Button>
                ) : (
                  <Button block color="primary" size="small" style={{ marginTop: 10 }} onClick={() => openLink(c)}>Ouvrir →</Button>
                )}
            </Card>
          )
        })}
      </Space>
      </PullToRefresh>

      <Dialog
        visible={addOpen}
        title="Ajouter un concours"
        content={<Input placeholder="Colle le lien (Instagram, site…)" value={url} onChange={setUrl} />}
        actions={[
          { key: 'cancel', text: 'Annuler' },
          { key: 'ok', text: 'Ajouter', onClick: () => { void doAdd() } },
        ]}
      />
    </div>
  )
}