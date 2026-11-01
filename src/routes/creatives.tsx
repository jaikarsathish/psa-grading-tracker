import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { listCreatives, listCampaigns, createCreative, updateCreative } from '@/server/psa-media'
import { useAction } from '@/lib/actions'
import { AppShell, Card, Field, inputCls, formatMoney, formatFull } from '@/components/psa-media-ui'

export const Route = createFileRoute('/creatives')({
  loader: async () => {
    const [creatives, campaigns] = await Promise.all([listCreatives(), listCampaigns()])
    return { creatives, campaigns }
  },
  component: Creatives,
})

function Creatives() {
  const { creatives, campaigns } = Route.useLoaderData()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ campaignId: '', title: '', isciCode: '', durationSec: '30', language: 'English', category: 'Health', status: 'active', notes: '' })
  const create = useAction((d: typeof form) => createCreative({ data: { campaignId: d.campaignId || null, title: d.title, isciCode: d.isciCode || null, durationSec: Number(d.durationSec) || 30, language: d.language, category: d.category, notes: d.notes || null } }), {
    onSuccess: () => { setOpen(false); setForm({ campaignId: '', title: '', isciCode: '', durationSec: '30', language: 'English', category: 'Health', status: 'active', notes: '' }) },
  })
  const [editing, setEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: '', campaignId: '', isciCode: '', durationSec: '30', language: 'English', category: '' })
  const startEdit = (c: (typeof creatives)[number]) => {
    setEditing(c.id)
    setEditForm({ title: c.title, campaignId: c.campaignId ?? '', isciCode: c.isciCode ?? '', durationSec: String(c.durationSec ?? 30), language: c.language ?? 'English', category: c.category ?? '' })
  }
  const saveEdit = useAction((d: { id: string } & typeof editForm) => updateCreative({ data: { id: d.id, title: d.title, campaignId: d.campaignId || null, isciCode: d.isciCode || null, durationSec: Number(d.durationSec) || 30, language: d.language, category: d.category || null } }), {
    onSuccess: () => setEditing(null),
  })
  const toggleStatus = useAction((d: { id: string; status: string }) => updateCreative({ data: { id: d.id, status: d.status } }), {})

  return (
    <AppShell active="creatives">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Creatives</h1>
          <p className="mt-1 text-sm text-neutral-500">Your PSA spots. Each airing from Nielsen attaches to one creative.</p>
        </div>
        <button onClick={() => setOpen(!open)} className="rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700">+ New creative</button>
      </div>

      {open && (
        <Card className="mt-4">
          <fieldset disabled={!create.ready} className="grid gap-3 sm:grid-cols-2">
            <Field label="Spot title *"><input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Get Your Flu Shot :30" /></Field>
            <Field label="Campaign">
              <select className={inputCls} value={form.campaignId} onChange={(e) => setForm({ ...form, campaignId: e.target.value })}>
                <option value="">— No campaign —</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="ISCI / Ad-ID"><input className={inputCls} value={form.isciCode} onChange={(e) => setForm({ ...form, isciCode: e.target.value })} placeholder="e.g. HLTHFL26H30E" /></Field>
            <Field label="Duration (sec)"><input type="number" min={5} className={inputCls} value={form.durationSec} onChange={(e) => setForm({ ...form, durationSec: e.target.value })} /></Field>
            <Field label="Language"><input className={inputCls} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} /></Field>
            <Field label="Category"><input className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          </fieldset>
          {create.error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{create.error}</p>}
          <div className="mt-3 flex gap-2">
            <button disabled={create.pending} onClick={() => create.run(form)} className="rounded-full bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">{create.pending ? 'Saving…' : 'Save creative'}</button>
            <button onClick={() => setOpen(false)} className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold">Cancel</button>
          </div>
        </Card>
      )}

      <div className="mt-4 grid gap-3">
        {creatives.map((c) => (
          <Card key={c.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-bold">{c.title}</h2>
                <p className="text-xs text-neutral-500">{c.isciCode || 'No Ad-ID'} · :{c.durationSec} · {c.language} · {c.campaignName ?? 'No campaign'}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">{c.status}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => (editing === c.id ? setEditing(null) : startEdit(c))} className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-100">{editing === c.id ? 'Close edit' : 'Edit'}</button>
              <button disabled={toggleStatus.pending} onClick={() => toggleStatus.run({ id: c.id, status: c.status === 'active' ? 'archived' : 'active' })} className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-100 disabled:opacity-50">{c.status === 'active' ? 'Archive' : 'Activate'}</button>
            </div>
            {editing === c.id && (
              <div className="mt-3 rounded-xl bg-neutral-50 p-3">
                <fieldset disabled={!saveEdit.ready} className="grid gap-2 sm:grid-cols-2">
                  <Field label="Spot title"><input className={inputCls} value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></Field>
                  <Field label="Campaign">
                    <select className={inputCls} value={editForm.campaignId} onChange={(e) => setEditForm({ ...editForm, campaignId: e.target.value })}>
                      <option value="">— No campaign —</option>
                      {campaigns.map((cm) => <option key={cm.id} value={cm.id}>{cm.name}</option>)}
                    </select>
                  </Field>
                  <Field label="ISCI / Ad-ID"><input className={inputCls} value={editForm.isciCode} onChange={(e) => setEditForm({ ...editForm, isciCode: e.target.value })} /></Field>
                  <Field label="Duration (sec)"><input type="number" min={5} className={inputCls} value={editForm.durationSec} onChange={(e) => setEditForm({ ...editForm, durationSec: e.target.value })} /></Field>
                  <Field label="Language"><input className={inputCls} value={editForm.language} onChange={(e) => setEditForm({ ...editForm, language: e.target.value })} /></Field>
                  <Field label="Category"><input className={inputCls} value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} /></Field>
                </fieldset>
                {saveEdit.error && <p role="alert" className="mt-2 text-xs font-medium text-red-700">{saveEdit.error}</p>}
                <div className="mt-2 flex gap-2">
                  <button disabled={saveEdit.pending} onClick={() => saveEdit.run({ id: c.id, ...editForm })} className="rounded-full bg-indigo-700 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">{saveEdit.pending ? 'Saving…' : 'Save changes'}</button>
                  <button onClick={() => setEditing(null)} className="rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold">Cancel</button>
                </div>
              </div>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div><div className="text-xs text-neutral-500">Airings</div><div className="font-extrabold">{formatFull(c.airings)}</div></div>
              <div><div className="text-xs text-neutral-500">Impressions</div><div className="font-extrabold">{formatFull(c.impressions)}</div></div>
              <div><div className="text-xs text-neutral-500">Donated $</div><div className="font-extrabold">{formatMoney(c.valueCents)}</div></div>
            </div>
          </Card>
        ))}
        {creatives.length === 0 && <p className="text-sm text-neutral-500">No creatives yet.</p>}
      </div>
    </AppShell>
  )
}
