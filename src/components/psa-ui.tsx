import { Link } from '@tanstack/react-router'
import { PackageSearch, LayoutDashboard, Radar, LineChart } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { STATUS_LABELS } from '@/lib/psa-constants'

export function formatMoney(cents: number | null | undefined) {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    (cents ?? 0) / 100,
  )
}

export const STATUS_COLORS: Record<string, string> = {
  prepping: 'bg-amber-100 text-amber-900 border-amber-200',
  shipped: 'bg-sky-100 text-sky-900 border-sky-200',
  received: 'bg-blue-100 text-blue-900 border-blue-200',
  research: 'bg-violet-100 text-violet-900 border-violet-200',
  grading: 'bg-indigo-100 text-indigo-900 border-indigo-200',
  assembly: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200',
  'shipped-back': 'bg-teal-100 text-teal-900 border-teal-200',
  returned: 'bg-emerald-100 text-emerald-900 border-emerald-200',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        STATUS_COLORS[status] ?? 'bg-neutral-100 text-neutral-800 border-neutral-200',
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function AppShell({ active, children }: { active: string; children: ReactNode }) {
  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, key: 'dash' },
    { to: '/track', label: 'Track', icon: PackageSearch, key: 'track' },
    { to: '/analytics', label: 'Analytics', icon: LineChart, key: 'analytics' },
  ]
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-700 text-white font-black text-lg">
              P
            </span>
            <span className="leading-tight">
              <span className="block font-extrabold tracking-tight">PSA Tracker</span>
              <span className="block text-xs text-neutral-500">Grading submissions, grades & value</span>
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-1">
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-4 text-xs text-neutral-500">
          <Radar className="h-4 w-4" />
          <span>PSA Tracker is a collector's organizer. Not affiliated with Professional Sports Authenticator (PSA).</span>
        </div>
      </footer>
    </div>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5', className)}>{children}</div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-semibold text-neutral-700">{label}</span>
      {children}
    </label>
  )
}

export const inputCls =
  'w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200'
