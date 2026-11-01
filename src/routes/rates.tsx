import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { listRates, setRate, deleteRate } from '@/server/psa-ops'
import { useAction } from '@/lib/actions'
import { AppShell, Card, Field, inputCls, DAYPARTS } from '@/components/psa-media-ui'
import { DMA_MARKETS } from '@/lib/dma-markets'

export const Route = createFileRoute('/rates')({
  loader: () => listRates(),
  component: Rates,
})

function Rates() {
  const rates = Route.useLoaderData()
  const [form, setForm] = useState({ market: 'New York', daypart: '*', cpm: '42' })
  const save = useAction((d: typeof form) => setRate({ data: { market: d.market, daypart: d.daypart === '*' ? '*' : d.daypart, cpm: Number(d.cpm) } }), {
    onSuccess: () => setForm({ market: 'New York', daypart: '*', cpm: '42' }),
  })
  const remove = useAction((d: { id: string }) => deleteRate({ data: d }), {})

  return (
    <AppShell active="rates">
      <h1 className="text-2xl font-extrabold tracking-tight">Rate card — CPM by market & daypart</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Donated value = impressions × CPM. We check this card first (exact market + daypart), then market only, then daypart only, then the campaign default.
      </p>

      <Card className="mt-4">
        <h2 className="font-bold">Set a CPM</h2>
        <fieldset disabled={!save.ready} className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Nielsen DMA market (* = all)">
            <select className={inputCls} value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })}>
              <option value="*">* — All markets</option>
              {DMA_MARKETS.map((d) => (
                <option key={d.rank} value={d.market}>#{d.rank} {d.market}</option>
              ))}
            </select>
          </Field>
          <Field label="Daypart (* = all)">
            <select className={inputCls} value={form.daypart} onChange={(e) => setForm({ ...form, daypart: e.target.value })}>
              <option value="*">* — All dayparts</option>
              {DAYPARTS.map((d: string) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="CPM $ per 1,000 impressions">
            <input type="number" min={0.5} step={0.5} className={inputCls} value={form.cpm} onChange={(e) => setForm({ ...form, cpm: e.target.value })} />
          </Field>
        </fieldset>
        {save.error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{save.error}</p>}
        <button disabled={save.pending} onClick={() => save.run(form)} className="mt-3 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
          {save.pending ? 'Saving…' : 'Save rate'}
        </button>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">Active rates ({rates.length})</h2>
        <ul className="mt-2 divide-y divide-neutral-100 text-sm">
          {rates.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0 truncate font-semibold">{r.market} · {r.daypart}</span>
              <span className="flex items-center gap-2">
                <span className="font-extrabold">${(r.cpmCents / 100).toFixed(2)}</span>
                <button onClick={() => remove.run({ id: r.id })} className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold hover:bg-neutral-100">Remove</button>
              </span>
            </li>
          ))}
          {rates.length === 0 && <li className="py-3 text-sm text-neutral-500">No rates yet.</li>}
        </ul>
        {remove.error && <p role="alert" className="mt-2 text-xs font-medium text-red-700">{remove.error}</p>}
      </Card>
    </AppShell>
  )
}
