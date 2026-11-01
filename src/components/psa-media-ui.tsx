import { Link } from '@tanstack/react-router'
import { LayoutDashboard, Megaphone, Clapperboard, RadioTower, FileBarChart2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function formatMoney(cents: number | null | undefined) {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format((cents ?? 0) / 100)
}
export function formatNum(n: number | null | undefined) {
  return new Intl.NumberFormat('en-US', { notation: n != null && n >= 1000000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n ?? 0)
}
export function formatFull(n: number | null | undefined) {
  return new Intl.NumberFormat('en-US').format(n ?? 0)
}

export function AppShell({ active, children }: { active: string; children: ReactNode }) {
  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, key: 'dash' },
    { to: '/campaigns', label: 'Campaigns', icon: Megaphone, key: 'campaigns' },
    { to: '/creatives', label: 'Creatives', icon: Clapperboard, key: 'creatives' },
    { to: '/airings', label: 'Airings', icon: RadioTower, key: 'airings' },
    { to: '/reports', label: 'Reports', icon: FileBarChart2, key: 'reports' },
    { to: '/rates', label: 'Rate card', icon: FileBarChart2, key: 'rates' },
    { to: '/team', label: 'Team', icon: Megaphone, key: 'team' },
  ]
  return (
    <div className="min-h-screen bg-background text-ink">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-black text-lg">P</span>
            <span className="leading-tight">
              <span className="block font-extrabold tracking-tight">PSA Value Tracker</span>
              <span className="block text-xs text-neutral-500">Donated media · Nielsen airings</span>
            </span>
          </Link>
          <nav className="ml-auto flex flex-wrap items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.key}
                to={l.to}
                activeProps={{ className: 'bg-neutral-900 text-white' }}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100',
                  active === l.key && 'bg-neutral-900 text-white hover:bg-neutral-900',
                )}
              >
                <l.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-neutral-500">
          PSA = Public Service Announcement. Values are donated-media estimates from Nielsen airings data (rate or impressions × CPM). Not affiliated with Nielsen.
        </div>
      </footer>
    </div>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5', className)}>{children}</div>
}
export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
      {sub ? <div className="mt-1 text-xs text-neutral-500">{sub}</div> : null}
    </Card>
  )
}
export const DAYPARTS = [
  'Early Morning',
  'Daytime',
  'Early Fringe',
  'Early News',
  'Prime Access',
  'Prime Time',
  'Late News',
  'Late Fringe',
  'Overnight',
  'Weekend',
] as const

export const inputCls =
  'w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200'
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-semibold text-neutral-700">{label}</span>
      {children}
    </label>
  )
}
