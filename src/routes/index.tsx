import { createFileRoute, Link } from '@tanstack/react-router'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getMediaDashboard } from '@/server/psa-media'
import { AppShell, Stat, formatMoney, formatNum, formatFull, Card } from '@/components/psa-media-ui'

export const Route = createFileRoute('/')({
  loader: () => getMediaDashboard(),
  component: Dashboard,
})

function Dashboard() {
  const d = Route.useLoaderData()
  const creativeById = new Map(d.creatives.map((c) => [c.id, c.title]))
  return (
    <AppShell active="dash">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Donated media at a glance</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Nielsen airings read in, valued as donated media, reported by creative & campaign.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/airings" className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
            Import Nielsen airings
          </Link>
          <Link to="/reports" className="rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-100">
            View reports
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Donated value" value={formatMoney(d.totals.valueCents)} sub={`${formatFull(d.totals.airings)} airings`} />
        <Stat label="Impressions" value={formatNum(d.totals.impressions)} sub="Nielsen estimated" />
        <Stat label="Creatives on air" value={String(d.totals.creatives)} sub={`${d.totals.activeCampaigns} of ${d.totals.campaigns} campaigns active`} />
        <Stat label="Avg $ / 1k impressions" value={d.totals.impressions ? `$${((d.totals.valueCents / 100) / (d.totals.impressions / 1000)).toFixed(2)}` : '—'} sub="Effective CPM" />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-bold">Donated value by month</h2>
          {d.monthly.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">No airings yet. Import a Nielsen CSV on the Airings page to see value build up.</p>
          ) : (
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.monthly.map((m) => ({ ...m, dollars: Math.round(m.valueCents / 100) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Donated $']} />
                  <Bar dataKey="dollars" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <h2 className="mt-5 font-bold">Top campaigns by donated value</h2>
          <ul className="mt-2 divide-y divide-neutral-100">
            {d.campStats.length === 0 && <li className="py-3 text-sm text-neutral-500">No campaigns yet.</li>}
            {d.campStats.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
                <span className="text-neutral-500">{formatFull(c.airings)} airings</span>
                <span className="font-extrabold">{formatMoney(c.valueCents)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-bold">Latest Nielsen airings</h2>
          <ul className="mt-3 grid gap-2">
            {d.recent.length === 0 && <li className="text-sm text-neutral-500">Nothing imported yet.</li>}
            {d.recent.map((a) => (
              <li key={a.id} className="rounded-xl bg-neutral-50 p-3 text-sm">
                <div className="font-semibold">{creativeById.get(a.creativeId) ?? 'Unknown creative'}</div>
                <div className="text-neutral-600 text-xs">{a.station} · {a.market} · {a.airDate} {a.airTime}</div>
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-neutral-500">{formatFull(a.impressions)} imp.</span>
                  <span className="font-bold">{formatMoney(a.computedValueCents)}</span>
                </div>
              </li>
            ))}
          </ul>
          <Link to="/airings" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
            Open Nielsen intake →
          </Link>
        </Card>
      </div>
    </AppShell>
  )
}
