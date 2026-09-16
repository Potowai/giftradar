import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Checkbox, Dialog, Empty, Input, NavBar, ProgressBar, SearchBar, Selector, Space, TabBar, Badge } from 'antd-mobile'
import { Contest, GeoScope, Platform } from './types'
import { Entry, loadStore, saveStore, Store, toggleStep } from './store'

let sample: Contest[] = []
let sampleLoaded = false

async function getFeed(): Promise<Contest[]> {
  if (sampleLoaded) return sample
  try {
    const r = await fetch('/api/feed')
    const j = await r.json()
    const list: Contest[] = Array.isArray(j.feed) ? j.feed : []
    if (list.length) { sample = list; sampleLoaded = true }
    return list
  } catch { return sample }
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
  const [tab, setTab] = useState('open')
  const [addOpen, setAddOpen] = useState(false)
  const [url, setUrl] = useState('')

  useEffect(() => { getFeed().then(setContests) }, [])

  const save = (s: Store) => { setStore(s); saveStore(s) }

  const toggle = (id: string, step: string) => {
    save(toggleStep(store, id, step))
  }

  const undone = useMemo(() =>
    contests.filter(c => !store.entries[c.id] || Object.values((store.entries[c.id] as Entry).steps ?? {}).some(v => !v)),
    [contests, store],
  )

  const visible = useMemo(() =>
    undone
      .filter(c => !geo || c.geo.scope === geo)
      .filter(c => !q || (c.title + ' ' + c.prize.name).toLowerCase().includes(q.toLowerCase()))
      .filter(c => !hideDone || !(store.entries[c.id]?.entered))
      .sort((a, b) => (daysUntil(a.deadline) ?? 999) - (daysUntil(b.deadline) ?? 999)),
    [undone, geo, q, hideDone, store],
  )

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh', background: '#0b1020', color: '#eef1f8' }}>
      <NavBar back={null} style={{ background: '#111830' }} right={<Badge content={undone.length}><Button size="mini" color="primary" onClick={() => setAddOpen(true)}>+ AJOUTER</Button></Badge>}>GiftRadar</NavBar>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 8 }}>
        <div style={{ flex: 1 }}><SearchBar placeholder="recherche (iPhone 17, Air…)" value={q} onChange={setQ} /></div>
        <Button size="small" fill={hideDone ? 'solid' : 'outline'} color="primary" onClick={() => setHideDone(!hideDone)}>Faits</Button>
      </div>

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
        <TabBar.Item key="open" title={`À faire (${visible.length})`} icon={<span>✓</span>} />
        <TabBar.Item key="done" title="Terminés" icon={<span>☑</span>} />
      </TabBar>

      {visible.length === 0 && <Empty description="Rien en ce moment — relance le scan." style={{ padding: 48 }} />}

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
              extra={<Space wrap><Badge color="#7b2ff7" content={PLATFORM_LABEL[c.platform]} /><Badge color={c.geo.scope === 'world' ? '#3ddc97' : '#ff4d6d'} content={GEO_LABEL[c.geo.scope]} /></Space>}
            >
                <b>{c.title}</b>
                <div style={{ opacity: 0.6, fontSize: 13, marginTop: 4 }}>échéance : {countdown(daysUntil(c.deadline))} · {c.language === 'fr' ? 'FR' : c.language === 'en' ? 'EN' : '?'} · pas de participation (Instagram/Site)</div>
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
                <Button block color="primary" size="small" style={{ marginTop: 10 }} onClick={() => { window.open(c.url, '_blank') }}>Ouvrir →</Button>
            </Card>
          )
        })}
      </Space>

      <Dialog
        visible={addOpen}
        title="Ajouter un concours"
        content={<Input placeholder="Colle le lien (Instagram, site…)" value={url} onChange={setUrl} />}
        actions={[
          { key: 'cancel', text: 'Annuler' },
          { key: 'ok', text: 'Ajouter', onClick: () => { setAddOpen(false); setUrl('') } },
        ]}
      />
    </div>
  )
}