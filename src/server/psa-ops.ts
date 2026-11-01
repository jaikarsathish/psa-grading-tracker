import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { cpmRates, teamMembers } from '@/db/schema'
import { getDb } from '@/lib/db'

function uid() {
  return crypto.randomUUID()
}
function nowIso() {
  return new Date().toISOString()
}

export const listTeam = createServerFn({ method: 'GET' }).handler(async () => {
  const db = await getDb()
  return db.select().from(teamMembers).orderBy(teamMembers.createdAt)
})

export const inviteMember = createServerFn({ method: 'POST' })
  .validator((d: { email: string; name?: string | null; role?: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase()
    if (!/[^@\s]+@[^@\s]+\.[^@\s]+/.test(email)) throw new Error('Enter a valid email address')
    const role = ['admin', 'editor', 'viewer'].includes(data.role ?? '') ? data.role! : 'viewer'
    const db = await getDb()
    const existing = await db.select().from(teamMembers).where(eq(teamMembers.email, email)).get()
    if (existing) {
      await db.update(teamMembers).set({ role, name: data.name?.trim() || existing.name, status: 'active' }).where(eq(teamMembers.id, existing.id))
      return { id: existing.id }
    }
    const id = uid()
    await db.insert(teamMembers).values({ id, email, name: data.name?.trim() || null, role, status: 'active', createdAt: nowIso() })
    return { id }
  })

export const updateMemberRole = createServerFn({ method: 'POST' })
  .validator((d: { id: string; role: string }) => d)
  .handler(async ({ data }) => {
    if (!['admin', 'editor', 'viewer'].includes(data.role)) throw new Error('Invalid role')
    const db = await getDb()
    await db.update(teamMembers).set({ role: data.role }).where(eq(teamMembers.id, data.id))
    return { id: data.id }
  })

export const removeMember = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const db = await getDb()
    await db.delete(teamMembers).where(eq(teamMembers.id, data.id))
    return { id: data.id }
  })

export const listRates = createServerFn({ method: 'GET' }).handler(async () => {
  const db = await getDb()
  return db.select().from(cpmRates).orderBy(cpmRates.market)
})

export const setRate = createServerFn({ method: 'POST' })
  .validator((d: { market: string; daypart?: string | null; cpm?: number }) => d)
  .handler(async ({ data }) => {
    const market = data.market.trim()
    if (!market) throw new Error('Market is required (use * for all markets)')
    const daypart = data.daypart?.trim() || '*'
    const cpmCents = Math.round((Number(data.cpm) || 0) * 100)
    if (!Number.isFinite(cpmCents) || cpmCents <= 0) throw new Error('Enter a CPM above $0')
    const db = await getDb()
    const all = await db.select().from(cpmRates)
    const hit = all.find((r) => r.market.toLowerCase() === market.toLowerCase() && (r.daypart ?? '*') === daypart)
    if (hit) {
      await db.update(cpmRates).set({ cpmCents, updatedAt: nowIso() }).where(eq(cpmRates.id, hit.id))
      return { id: hit.id }
    }
    const id = uid()
    await db.insert(cpmRates).values({ id, market, daypart, cpmCents, updatedAt: nowIso() })
    return { id }
  })

export const deleteRate = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const db = await getDb()
    await db.delete(cpmRates).where(eq(cpmRates.id, data.id))
    return { id: data.id }
  })

export const getCoverage = createServerFn({ method: 'GET' }).handler(async () => {
  const { airings } = await import('@/db/schema')
  const { desc } = await import('drizzle-orm')
  const db = await getDb()
  const all = await db.select().from(airings).orderBy(desc(airings.airDate)).limit(5000)
  const byMarket = new Map<string, { airings: number; impressions: number; valueCents: number; stations: Set<string> }>()
  const byStation = new Map<string, { market: string; airings: number; impressions: number; valueCents: number }>()
  for (const a of all) {
    const m = (a.market || 'Unknown').trim() || 'Unknown'
    const me = byMarket.get(m) ?? { airings: 0, impressions: 0, valueCents: 0, stations: new Set<string>() }
    me.airings += 1
    me.impressions += a.impressions ?? 0
    me.valueCents += a.computedValueCents ?? 0
    me.stations.add(a.station)
    byMarket.set(m, me)
    const s = (a.station || 'Unknown').trim() || 'Unknown'
    const se = byStation.get(s) ?? { market: m, airings: 0, impressions: 0, valueCents: 0 }
    se.airings += 1
    se.impressions += a.impressions ?? 0
    se.valueCents += a.computedValueCents ?? 0
    byStation.set(s, se)
  }
  return {
    markets: [...byMarket.entries()]
      .map(([market, v]) => ({ market, airings: v.airings, impressions: v.impressions, valueCents: v.valueCents, stations: v.stations.size }))
      .sort((a, b) => b.valueCents - a.valueCents),
    stations: [...byStation.entries()]
      .map(([station, v]) => ({ station, ...v }))
      .sort((a, b) => b.valueCents - a.valueCents)
      .slice(0, 60),
    distinctMarkets: byMarket.size,
  }
})
