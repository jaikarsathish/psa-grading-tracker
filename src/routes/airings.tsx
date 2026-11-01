import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { listAirings, listCreatives, createAiring, importAirings } from '@/server/psa-media'
import { useAction } from '@/lib/actions'
import { AppShell, Card, Field, inputCls, formatMoney, formatFull, DAYPARTS } from '@/components/psa-media-ui'
import { DMA_MARKETS } from '@/lib/dma-markets'

export const Route = createFileRoute('/airings')({
  loader: async () => {
    const [airings, creatives] = await Promise.all([listAirings({ data: {} }), listCreatives()])
    return { airings, creatives }
  },
  component: Airings,
})

type ParsedRow = {
  creativeTitle: string
  isci: string
  station: string
  market: string
  airDate: string
  airTime: string
  program: string
  daypart: string
  durationSec: number
  impressions: number
  rateValue: number | null
}

// Quote-aware CSV split: handles "Title, with comma" correctly.
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((c) => c.trim().replace(/^"|"$/g, ''))
}

function parseNielsenCsv(text: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return { rows: [], errors: ['File looks empty — need a header row plus data rows.'] }
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/["']/g, ''))
  const idx = (names: string[]) => {
    for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i }
    return -1
  }
  const ci = {
    creative: idx(['creative', 'spot', 'title']),
    isci: idx(['isci', 'ad-id', 'ad id', 'adid']),
    station: idx(['station', 'callsign', 'call sign']),
    market: idx(['market', 'dma']),
    date: idx(['date', 'air date', 'airdate']),
    time: idx(['time', 'air time', 'airtime']),
    program: idx(['program', 'show']),
    daypart: idx(['daypart']),
    duration: idx(['duration', 'length', 'secs', 'seconds']),
    impressions: idx(['impressions', 'imp', 'audience', 'viewers']),
    value: idx(['value', 'rate', 'media value', 'donated value', 'cost']),
  }
  const errors: string[] = []
  const rows: ParsedRow[] = []
  for (let ln = 1; ln < lines.length; ln++) {
    const cols = splitCsvLine(lines[ln])
    const get = (i: number) => (i >= 0 ? (cols[i] ?? '') : '')
    const airDate = get(ci.date)
    if (!airDate) { errors.push(`Row ${ln + 1}: missing date — skipped.`); continue }
    rows.push({
      creativeTitle: get(ci.creative) || 'Unmatched spot',
      isci: get(ci.isci) || '',
      station: get(ci.station) || 'Unknown',
      market: get(ci.market) || 'Unknown',
      airDate,
      airTime: get(ci.time) || '00:00',
      program: get(ci.program) || '',
      daypart: get(ci.daypart) || 'Overnight',
      durationSec: Number(get(ci.duration)) || 30,
      impressions: Number(get(ci.impressions).replace(/[^0-9.]/g, '')) || 0,
      rateValue: get(ci.value) ? Number(get(ci.value).replace(/[^0-9.]/g, '')) || 0 : null,
    })
  }
  return { rows, errors }
}

function MarketPicker({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  const [q, setQ] = useState(value)
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return DMA_MARKETS.slice(0, 12)
    return DMA_MARKETS.filter((d) => d.market.toLowerCase().includes(needle)).slice(0, 12)
  }, [q])
  return (
    <div className="grid gap-1">
      <input
        list={id}
        className={inputCls}
        value={value}
        onChange={(e) => { onChange(e.target.value); setQ(e.target.value) }}
        placeholder="Type to search 210 DMAs…"
      />
      <datalist id={id}>
        {matches.map((d) => (
          <option key={d.rank} value={d.market}>#{d.rank} {d.market}</option>
        ))}
      </datalist>
      <p className="text-xs text-neutral-500">210 Nielsen DMAs — start typing, e.g. “Denver”.</p>
    </div>
  )
}

function Airings() {
  const { airings, creatives } = Route.useLoaderData()
  const [csvText, setCsvText] = useState('')
  const [allRows, setAllRows] = useState<ParsedRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [bulkCreativeId, setBulkCreativeId] = useState('')
  const [singleCreativeId, setSingleCreativeId] = useState('')
  const [form, setForm] = useState({ station: '', market: 'New York', airDate: '', airTime: '', program: '', daypart: 'Early Morning', durationSec: '30', impressions: '10000', rateValue: '' })

  const doImport = useAction((d: { rows: ParsedRow[]; defaultCreativeId: string | null }) => importAirings({ data: d }), {
    onSuccess: (r) => { alert(`Imported ${r.imported} airings.`); setAllRows([]); setCsvText('') },
  })
  const addOne = useAction((d: typeof form & { creativeId: string }) => createAiring({ data: { creativeId: d.creativeId, station: d.station, market: d.market, airDate: d.airDate, airTime: d.airTime || '', program: d.program || '', daypart: d.daypart, durationSec: Number(d.durationSec) || 30, impressions: Number(d.impressions) || 0, rateValue: d.rateValue ? Number(d.rateValue) : null } }), {
    onSuccess: () => setForm({ station: '', market: 'New York', airDate: '', airTime: '', program: '', daypart: 'Early Morning', durationSec: '30', impressions: '10000', rateValue: '' }),
  })

  const handleFile = async (f: File | undefined) => {
    if (!f) return
    const text = await f.text()
    setCsvText(text)
    const { rows, errors } = parseNielsenCsv(text)
    setAllRows(rows)
    setParseErrors(errors)
  }
  const handlePreview = () => {
    const { rows, errors } = parseNielsenCsv(csvText)
    setAllRows(rows)
    setParseErrors(errors)
  }
  const preview = allRows.slice(0, 200)

  return (
    <AppShell active="airings">
      <h1 className="text-2xl font-extrabold tracking-tight">Nielsen airings intake</h1>
      <p className="mt-1 text-sm text-neutral-500">Paste or upload your Nielsen donated-spot report. We match each row to a creative by spot title, then value it with the market/daypart rate card.</p>

      <Card className="mt-4">
        <h2 className="font-bold">1 · Load Nielsen CSV</h2>
        <p className="mt-1 text-xs text-neutral-500">Expected headers (case-insensitive): creative/spot, station, market, date, time, program, daypart, duration, impressions, value. Quoted titles with commas are handled. Missing columns default sensibly.</p>
        <div className="mt-3 grid gap-3">
          <input type="file" accept=".csv,.txt" onChange={(e) => handleFile(e.target.files?.[0])} className="text-sm" />
          <textarea className={inputCls + ' min-h-28 font-mono text-xs'} placeholder="…or paste CSV here" value={csvText} onChange={(e) => { setCsvText(e.target.value); if (!e.target.value.trim()) { setAllRows([]); setParseErrors([]) } }} />
          <div className="flex flex-wrap gap-2">
            <button onClick={handlePreview} className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-neutral-100">Preview</button>
            <select className={inputCls + ' max-w-xs'} value={bulkCreativeId} onChange={(e) => setBulkCreativeId(e.target.value)}>
              <option value="">Auto-match by spot title (recommended)</option>
              {creatives.map((c) => <option key={c.id} value={c.id}>Assign all to: {c.title}</option>)}
            </select>
            <button disabled={doImport.pending || allRows.length === 0} onClick={() => doImport.run({ rows: allRows, defaultCreativeId: bulkCreativeId || null })} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
              {doImport.pending ? 'Importing…' : `Import ${allRows.length} row${allRows.length === 1 ? '' : 's'}`}
            </button>
          </div>
          {parseErrors.length > 0 && <ul className="text-xs text-amber-700">{parseErrors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}</ul>}
          {doImport.error && <p role="alert" className="text-sm font-medium text-red-700">{doImport.error}</p>}
          {preview.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full min-w-160 text-xs">
                <thead className="bg-neutral-50 text-left"><tr><th className="px-2 py-1.5">Spot</th><th className="px-2 py-1.5">Station</th><th className="px-2 py-1.5">Market</th><th className="px-2 py-1.5">Date</th><th className="px-2 py-1.5">Impr.</th><th className="px-2 py-1.5">Value</th></tr></thead>
                <tbody>{preview.slice(0, 8).map((r, i) => <tr key={i} className="border-t border-neutral-100"><td className="px-2 py-1.5">{r.creativeTitle}</td><td className="px-2 py-1.5">{r.station}</td><td className="px-2 py-1.5">{r.market}</td><td className="px-2 py-1.5">{r.airDate}</td><td className="px-2 py-1.5">{formatFull(r.impressions)}</td><td className="px-2 py-1.5">{r.rateValue ? formatMoney(Math.round(r.rateValue * 100)) : '—'}</td></tr>)}</tbody>
              </table>
              <p className="px-2 py-1.5 text-xs text-neutral-500">Showing {Math.min(8, preview.length)} of {allRows.length} rows ready to import{allRows.length > 200 ? ' (preview shows first 200)' : ''}.</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">2 · Add a single airing manually</h2>
        <fieldset disabled={!addOne.ready} className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Creative *">
            <select className={inputCls} value={singleCreativeId} onChange={(e) => setSingleCreativeId(e.target.value)}>
              <option value="">Select…</option>
              {creatives.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </Field>
          <Field label="Station *"><input className={inputCls} value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} placeholder="WABC" /></Field>
          <Field label="Nielsen DMA market *">
            <MarketPicker id="dma-single" value={form.market} onChange={(v) => setForm({ ...form, market: v })} />
          </Field>
          <Field label="Air date *"><input type="date" className={inputCls} value={form.airDate} onChange={(e) => setForm({ ...form, airDate: e.target.value })} /></Field>
          <Field label="Air time"><input type="time" className={inputCls} value={form.airTime} onChange={(e) => setForm({ ...form, airTime: e.target.value })} /></Field>
          <Field label="Daypart">
            <select className={inputCls} value={form.daypart} onChange={(e) => setForm({ ...form, daypart: e.target.value })}>
              {DAYPARTS.map((d: string) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Program"><input className={inputCls} value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} placeholder="Evening News" /></Field>
          <Field label="Impressions"><input type="number" className={inputCls} value={form.impressions} onChange={(e) => setForm({ ...form, impressions: e.target.value })} /></Field>
          <Field label="Rate value $ (optional)"><input type="number" step="0.01" className={inputCls} value={form.rateValue} onChange={(e) => setForm({ ...form, rateValue: e.target.value })} placeholder="Leave blank to use CPM" /></Field>
        </fieldset>
        {addOne.error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{addOne.error}</p>}
        <button disabled={addOne.pending} onClick={() => addOne.run({ ...form, creativeId: singleCreativeId })} className="mt-3 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">{addOne.pending ? 'Saving…' : 'Add airing'}</button>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">Recent airings ({airings.length})</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-170 text-sm">
            <thead className="text-left text-xs text-neutral-500"><tr><th className="py-1.5 pr-2">Date</th><th className="py-1.5 pr-2">Creative</th><th className="py-1.5 pr-2">Station / Market</th><th className="py-1.5 pr-2">Daypart</th><th className="py-1.5 pr-2 text-right">Impr.</th><th className="py-1.5 text-right">Value</th></tr></thead>
            <tbody>
              {airings.slice(0, 50).map((a) => (
                <tr key={a.id} className="border-t border-neutral-100">
                  <td className="py-1.5 pr-2 text-xs">{a.airDate}{a.airTime ? ` ${a.airTime}` : ''}</td>
                  <td className="py-1.5 pr-2">{a.creativeTitle}</td>
                  <td className="py-1.5 pr-2 text-xs">{a.station} · {a.market}</td>
                  <td className="py-1.5 pr-2 text-xs">{a.daypart}</td>
                  <td className="py-1.5 pr-2 text-right">{formatFull(a.impressions)}</td>
                  <td className="py-1.5 text-right font-semibold">{formatMoney(a.computedValueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  )
}
