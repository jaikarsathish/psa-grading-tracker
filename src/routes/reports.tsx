import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { listCampaigns, listCreatives, getCampaignReport, getCreativeReport } from '@/server/psa-media'
import { getCoverage } from '@/server/psa-ops'
import { AppShell, Card, Field, inputCls, formatMoney, formatFull } from '@/components/psa-media-ui'

export const Route = createFileRoute('/reports')({
  loader: async () => {
    const [campaigns, creatives, coverage] = await Promise.all([listCampaigns(), listCreatives(), getCoverage()])
    return { campaigns, creatives, coverage }
  },
  component: Reports,
})

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

function Reports() {
  const { campaigns, creatives, coverage } = Route.useLoaderData()
  const [campId, setCampId] = useState(campaigns[0]?.id ?? '')
  const [creativeId, setCreativeId] = useState('')
  const [campReport, setCampReport] = useState<Awaited<ReturnType<typeof getCampaignReport>> | null>(null)
  const [creativeReport, setCreativeReport] = useState<Awaited<ReturnType<typeof getCreativeReport>> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadCamp = async (id: string) => {
    if (!id) return
    setLoading(true); setError('')
    try { setCampReport(await getCampaignReport({ data: { campaignId: id } })) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load campaign report') }
    finally { setLoading(false) }
  }
  const loadCreative = async (id: string) => {
    if (!id) return
    setLoading(true); setError('')
    try { setCreativeReport(await getCreativeReport({ data: { creativeId: id } })) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load creative report') }
    finally { setLoading(false) }
  }

  return (
    <AppShell active="reports">
      <h1 className="text-2xl font-extrabold tracking-tight">Creative, campaign & coverage reports</h1>
      <p className="mt-1 text-sm text-neutral-500">Funder-ready totals: airings, impressions, donated value, plus market and station coverage. Export to CSV for your board packet.</p>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm font-medium text-red-800">{error}</p>}

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Market / station coverage ({coverage.distinctMarkets} DMAs)</h2>
          <button onClick={() => downloadCsv('market-coverage.csv', [['Market', 'Airings', 'Stations', 'Impressions', 'Value $'], ...coverage.markets.map((m) => [m.market, m.airings, m.stations, m.impressions, (m.valueCents / 100).toFixed(2)])])} className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-ink hover:bg-neutral-100">Export coverage CSV</button>
        </div>
        {coverage.markets.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No airings yet — import a Nielsen CSV on the Airings page.</p>
        ) : (
          <>
            <div className="mt-3 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coverage.markets.slice(0, 8).map((m) => ({ name: m.market.length > 12 ? `${m.market.slice(0, 12)}…` : m.market, dollars: Math.round(m.valueCents / 100) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} interval={0} angle={-18} dy={8} height={52} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Donated $']} />
                  <Bar dataKey="dollars" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold">Top markets</h3>
                <ul className="mt-1 space-y-1 text-sm">
                  {coverage.markets.slice(0, 8).map((m) => <li key={m.market} className="flex justify-between gap-2 border-b border-neutral-100 py-1"><span className="min-w-0 truncate">{m.market} · {m.stations} st.</span><span className="shrink-0 font-semibold">{formatFull(m.airings)} · {formatMoney(m.valueCents)}</span></li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold">Top stations</h3>
                <ul className="mt-1 space-y-1 text-sm">
                  {coverage.stations.slice(0, 8).map((s) => <li key={s.station} className="flex justify-between gap-2 border-b border-neutral-100 py-1"><span className="min-w-0 truncate">{s.station} · {s.market}</span><span className="shrink-0 font-semibold">{formatFull(s.airings)} · {formatMoney(s.valueCents)}</span></li>)}
                </ul>
              </div>
            </div>
          </>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-bold">Campaign report</h2>
          <div className="mt-2 flex gap-2">
            <select className={inputCls} value={campId} onChange={(e) => { setCampId(e.target.value); loadCamp(e.target.value) }}>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={() => loadCamp(campId)} disabled={loading || !campId} className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">Run</button>
          </div>
          {campReport && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-neutral-50 p-2"><div className="text-lg font-extrabold">{formatFull(campReport.totals.airings)}</div><div className="text-xs text-neutral-500">Airings</div></div>
                <div className="rounded-xl bg-neutral-50 p-2"><div className="text-lg font-extrabold">{formatFull(campReport.totals.impressions)}</div><div className="text-xs text-neutral-500">Impressions</div></div>
                <div className="rounded-xl bg-neutral-50 p-2"><div className="text-lg font-extrabold">{formatMoney(campReport.totals.value)}</div><div className="text-xs text-neutral-500">Donated $</div></div>
              </div>
              <div>
                <h3 className="text-sm font-bold">By creative</h3>
                {campReport.byCreative.length > 0 && (
                  <div className="mt-2 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={campReport.byCreative.slice(0, 8).map((r) => ({ name: r.title.length > 14 ? `${r.title.slice(0, 14)}…` : r.title, dollars: Math.round(r.value / 100) }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={11} interval={0} angle={-18} dy={8} height={52} />
                        <YAxis fontSize={11} />
                        <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Donated $']} />
                        <Bar dataKey="dollars" fill="#2563eb" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <ul className="mt-1 space-y-1 text-sm">
                  {campReport.byCreative.map((r) => <li key={r.creativeId} className="flex justify-between gap-2 border-b border-neutral-100 py-1"><span className="min-w-0 truncate">{r.title}</span><span className="shrink-0 font-semibold">{formatFull(r.airings)} · {formatMoney(r.value)}</span></li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold">By market</h3>
                {campReport.byMarket.length > 0 && (
                  <div className="mt-2 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={campReport.byMarket.slice(0, 8).map((r) => ({ name: r.market.length > 12 ? `${r.market.slice(0, 12)}…` : r.market, dollars: Math.round(r.value / 100) }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={11} interval={0} angle={-18} dy={8} height={52} />
                        <YAxis fontSize={11} />
                        <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Donated $']} />
                        <Bar dataKey="dollars" fill="#2563eb" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <ul className="mt-1 space-y-1 text-sm">
                  {campReport.byMarket.slice(0, 8).map((r) => <li key={r.market} className="flex justify-between gap-2 border-b border-neutral-100 py-1"><span>{r.market}</span><span className="font-semibold">{formatFull(r.airings)} · {formatMoney(r.value)}</span></li>)}
                </ul>
              </div>
              <button onClick={() => campReport && downloadCsv(`campaign-${campReport.campaign.name}.csv`, [['Creative', 'Airings', 'Impressions', 'Value $'], ...campReport.byCreative.map((r) => [r.title, r.airings, r.impressions, (r.value / 100).toFixed(2)])])} className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold">Export creatives CSV</button>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="font-bold">Creative report</h2>
          <div className="mt-2 flex gap-2">
            <select className={inputCls} value={creativeId} onChange={(e) => { setCreativeId(e.target.value); loadCreative(e.target.value) }}>
              <option value="">Select a spot…</option>
              {creatives.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <button onClick={() => loadCreative(creativeId)} disabled={loading || !creativeId} className="shrink-0 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50">Run</button>
          </div>
          {creativeReport && (
            <div className="mt-3 space-y-3">
              <div className="text-sm text-neutral-600">{creativeReport.creative.isciCode || 'No Ad-ID'} · :{creativeReport.creative.durationSec} · {creativeReport.creative.campaignName ?? 'No campaign'}</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-neutral-50 p-2"><div className="text-lg font-extrabold">{formatFull(creativeReport.totals.airings)}</div><div className="text-xs text-neutral-500">Airings</div></div>
                <div className="rounded-xl bg-neutral-50 p-2"><div className="text-lg font-extrabold">{formatFull(creativeReport.totals.impressions)}</div><div className="text-xs text-neutral-500">Impr.</div></div>
                <div className="rounded-xl bg-neutral-50 p-2"><div className="text-lg font-extrabold">{formatMoney(creativeReport.totals.value)}</div><div className="text-xs text-neutral-500">Value</div></div>
              </div>
              <div>
                <h3 className="text-sm font-bold">Daypart split</h3>
                {creativeReport.byDaypart.length > 0 && (
                  <div className="mt-2 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={creativeReport.byDaypart.map((r) => ({ name: r.daypart || 'Unknown', dollars: Math.round(r.value / 100) }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={11} interval={0} angle={-18} dy={8} height={52} />
                        <YAxis fontSize={11} />
                        <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Donated $']} />
                        <Bar dataKey="dollars" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <ul className="mt-1 space-y-1 text-sm">
                  {creativeReport.byDaypart.map((r) => <li key={r.daypart} className="flex justify-between border-b border-neutral-100 py-1"><span>{r.daypart}</span><span className="font-semibold">{formatFull(r.airings)} · {formatMoney(r.value)}</span></li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold">Top markets</h3>
                <ul className="mt-1 space-y-1 text-sm">
                  {creativeReport.byMarket.slice(0, 8).map((r) => <li key={r.market} className="flex justify-between border-b border-neutral-100 py-1"><span>{r.market}</span><span className="font-semibold">{formatMoney(r.value)}</span></li>)}
                </ul>
              </div>
              <Field label="Recent airings"><span className="text-xs text-neutral-500">{creativeReport.recent.length} most recent shown in airings log</span></Field>
              <button onClick={() => creativeReport && downloadCsv(`creative-${creativeReport.creative.title}.csv`, [['Date', 'Station', 'Market', 'Daypart', 'Impressions', 'Value $'], ...creativeReport.recent.map((a) => [a.airDate, a.station, a.market, a.daypart, a.impressions, ((a.computedValue ?? 0) / 100).toFixed(2)])])} className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold">Export airings CSV</button>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  )
}
