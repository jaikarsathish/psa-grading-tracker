import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { listCampaigns, createCampaign, updateCampaign } from '@/server/psa-media'
import { useAction } from '@/lib/actions'
import { AppShell, Card, Field, inputCls, formatMoney, formatFull } from '@/components/psa-media-ui'

export const Route = createFileRoute('/campaigns')({
  loader: () => listCampaigns(),
  component: Campaigns,
})

function Campaigns() {
  const data = Route.useLoaderData()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', sponsor: '', category: 'Health', startDate: '', endDate: '', goalImpressions: '500000', defaultCpm: '25' })
  const create = useAction((d: typeof form) => createCampaign({ data: { name: d.name, sponsor: d.sponsor, category: d.category, startDate: d.startDate || null, endDate: d.endDate || null, goalImpressions: Number(d.goalImpressions) || 0, defaultCpm: Number(d.defaultCpm) || 25 } }), {
    onSuccess: () => { setOpen(false); setForm({ name: '', sponsor: '', category: 'Health', startDate: '', endDate: '', goalImpressions: '500000', defaultCpm: '25' }) },
  })
  const [editing, setEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', sponsor: '', startDate: '', endDate: '', goalImpressions: '', defaultCpm: '' })
  const startEdit = (c: (typeof data)[number]) => {
    setEditing(c.id)
    setEditForm({ name: c.name, sponsor: c.sponsor ?? '', startDate: c.startDate ?? '', endDate: c.endDate ?? '', goalImpressions: String(c.goalImpressions ?? 0), defaultCpm: String((c.defaultCpmCents ?? 2500) / 100) })
  }
  const saveEdit = useAction((d: { id: string } & typeof editForm) => updateCampaign({ data: { id: d.id, name: d.name.trim() || undefined, sponsor: d.sponsor, startDate: d.startDate || null, endDate: d.endDate || null, goalImpressions: Number(d.goalImpressions) || 0, defaultCpm: Number(d.defaultCpm) || undefined } }), {
    onSuccess: () => setEditing(null),
  })
  const toggleStatus = useAction((d: { id: string; status: string }) => updateCampaign({ data: { id: d.id, status: d.status } }), {})

  return (
    <AppShell active="campaigns">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-sm text-neutral-500">Group creatives under a flight. Each campaign sets the default CPM used for valuation.</p>
        </div>
        <button onClick={() => setOpen(!open)} className="rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700">+ New campaign</button>
      </div>

      {open && (
        <Card className="mt-4">
          <fieldset disabled={!create.ready} className="grid gap-3 sm:grid-cols-2">
            <Field label="Campaign name *"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Flu Season 2026" /></Field>
            <Field label="Sponsor / nonprofit"><input className={inputCls} value={form.sponsor} onChange={(e) => setForm({ ...form, sponsor: e.target.value })} placeholder="e.g. City Health Dept" /></Field>
            <Field label="Category"><input className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
            <Field label="Default CPM $ (for valuation)"><input type="number" min={1} step="0.5" className={inputCls} value={form.defaultCpm} onChange={(e) => setForm({ ...form, defaultCpm: e.target.value })} /></Field>
            <Field label="Flight start"><input type="date" className={inputCls} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="Flight end"><input type="date" className={inputCls} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
            <Field label="Goal impressions"><input type="number" className={inputCls} value={form.goalImpressions} onChange={(e) => setForm({ ...form, goalImpressions: e.target.value })} /></Field>
          </fieldset>
          {create.error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{create.error}</p>}
          <div className="mt-3 flex gap-2">
            <button disabled={create.pending} onClick={() => create.run(form)} className="rounded-full bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">
              {create.pending ? 'Saving…' : 'Save campaign'}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold">Cancel</button>
          </div>
        </Card>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {data.map((c) => (
          <Card key={c.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate font-bold">{c.name}</h2>
                <p className="text-xs text-neutral-500">{c.sponsor || 'No sponsor'} · {c.category} · CPM ${(c.defaultCpmCents / 100).toFixed(2)}</p>
              </div>
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold">{c.status}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div><div className="text-xs text-neutral-500">Airings</div><div className="font-extrabold">{formatFull(c.airings)}</div></div>
              <div><div className="text-xs text-neutral-500">Impressions</div><div className="font-extrabold">{formatFull(c.impressions)}</div></div>
              <div><div className="text-xs text-neutral-500">Value</div><div className="font-extrabold">{formatMoney(c.valueCents)}</div></div>
            </div>
            <div className="mt-2 text-xs text-neutral-500">Goal: {formatFull(c.goalImpressions)} imp. — {c.goalImpressions ? Math.round((c.impressions / c.goalImpressions) * 100) : 0}% reached</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => (editing === c.id ? setEditing(null) : startEdit(c))} className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-100">{editing === c.id ? 'Close edit' : 'Edit flight'}</button>
              <button disabled={toggleStatus.pending} onClick={() => toggleStatus.run({ id: c.id, status: c.status === 'active' ? 'archived' : 'active' })} className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-100 disabled:opacity-50">{c.status === 'active' ? 'Archive' : 'Activate'}</button>
            </div>
            {toggleStatus.error && <p role="alert" className="mt-2 text-xs font-medium text-red-700">{toggleStatus.error}</p>}
            {editing === c.id && (
              <div className="mt-3 rounded-xl bg-neutral-50 p-3">
                <fieldset disabled={!saveEdit.ready} className="grid gap-2 sm:grid-cols-2">
                  <Field label="Name"><input className={inputCls} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></Field>
                  <Field label="Sponsor"><input className={inputCls} value={editForm.sponsor} onChange={(e) => setEditForm({ ...editForm, sponsor: e.target.value })} /></Field>
                  <Field label="Flight start"><input type="date" className={inputCls} value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} /></Field>
                  <Field label="Flight end"><input type="date" className={inputCls} value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} /></Field>
                  <Field label="Goal impressions"><input type="number" className={inputCls} value={editForm.goalImpressions} onChange={(e) => setEditForm({ ...editForm, goalImpressions: e.target.value })} /></Field>
                  <Field label="Default CPM $"><input type="number" min={1} step="0.5" className={inputCls} value={editForm.defaultCpm} onChange={(e) => setEditForm({ ...editForm, defaultCpm: e.target.value })} /></Field>
                </fieldset>
                {saveEdit.error && <p role="alert" className="mt-2 text-xs font-medium text-red-700">{saveEdit.error}</p>}
                <div className="mt-2 flex gap-2">
                  <button disabled={saveEdit.pending} onClick={() => saveEdit.run({ id: c.id, ...editForm })} className="rounded-full bg-indigo-700 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">{saveEdit.pending ? 'Saving…' : 'Save changes'}</button>
                  <button onClick={() => setEditing(null)} className="rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold">Cancel</button>
                </div>
              </div>
            )}
          </Card>
        ))}
        {data.length === 0 && <p className="text-sm text-neutral-500">No campaigns yet. Create your first flight above.</p>}
      </div>
    </AppShell>
  )
}
