import { createServerFn } from '@tanstack/react-start'
import { asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { airings, campaigns, cpmRates, creatives } from '@/db/schema'
import { DMA_MARKETS } from '@/lib/dma-markets'

function uid() {
  return crypto.randomUUID()
}
function nowIso() {
  return new Date().toISOString()
}
function dollarsToCents(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(String(v).replace(/[$,]/g, '')) : typeof v === 'number' ? v : 0
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n * 100)
}
function valueFor(impressions: number, rateCents: number | null, cpmCents: number): number {
  if (rateCents != null && rateCents > 0) return rateCents
  return Math.round((Math.max(0, impressions) * Math.max(0, cpmCents)) / 1000)
}
function dmaRankFor(market: string): number | null {
  const q = (market || '').trim().toLowerCase()
  if (!q) return null
  const hit = DMA_MARKETS.find((d) => d.market.toLowerCase() === q)
  return hit ? hit.rank : null
}
async function resolveCpm(db: any, market: string, daypart: string, fallbackCents: number): Promise<{ cpm: number }> {
  try {
    const all = await db.select().from(cpmRates)
    const m = (market || '').trim().toLowerCase()
    const dp = (daypart || '').trim()
    const exact = all.find((r: any) => r.market.toLowerCase() === m && (r.daypart ?? '*') === dp)
    if (exact) return { cpm: exact.cpmCents }
    const mAny = all.find((r: any) => r.market.toLowerCase() === m && (r.daypart ?? '*') === '*')
    if (mAny) return { cpm: mAny.cpmCents }
    if (dp) {
      const anyDp = all.find((r: any) => r.market === '*' && r.daypart === dp)
      if (anyDp) return { cpm: anyDp.cpmCents }
    }
    const global = all.find((r: any) => r.market === '*' && (r.daypart ?? '*') === '*')
    if (global) return { cpm: global.cpmCents }
  } catch { /* fall through to campaign default */ }
  return { cpm: fallbackCents }
}

export const getMediaDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  const { getDb } = await import('@/lib/db')
  const db = await getDb()
  const [allCamps, allCre, allAir] = await Promise.all([
    db.select().from(campaigns).orderBy(desc(campaigns.updatedAt)),
    db.select().from(creatives),
    db.select().from(airings).orderBy(desc(airings.airDate)).limit(5000),
  ])
  const totalValue = allAir.reduce((s, a) => s + (a.computedValueCents ?? 0), 0)
  const totalImp = allAir.reduce((s, a) => s + (a.impressions ?? 0), 0)

  const airByCreative = new Map<string, typeof allAir>()
  for (const a of allAir) {
    const arr = airByCreative.get(a.creativeId) ?? []
    arr.push(a)
    airByCreative.set(a.creativeId, arr)
  }
  const creByCamp = new Map<string, typeof allCre>()
  for (const c of allCre) {
    const k = c.campaignId ?? '__none__'
    const arr = creByCamp.get(k) ?? []
    arr.push(c as never)
    creByCamp.set(k, arr)
  }
  const campStats = allCamps.map((camp) => {
    const cres = creByCamp.get(camp.id) ?? []
    let imp = 0
    let val = 0
    let spots = 0
    for (const cr of cres) {
      for (const a of airByCreative.get(cr.id) ?? []) {
        imp += a.impressions ?? 0
        val += a.computedValueCents ?? 0
        spots += 1
      }
    }
    return { ...camp, creatives: cres.length, airings: spots, impressions: imp, valueCents: val }
  })

  const byMarketMap = new Map<string, { airings: number; impressions: number; valueCents: number }>()
  for (const a of allAir) {
    const m = (a.market || 'Unknown').trim() || 'Unknown'
    const e = byMarketMap.get(m) ?? { airings: 0, impressions: 0, valueCents: 0 }
    e.airings += 1
    e.impressions += a.impressions ?? 0
    e.valueCents += a.computedValueCents ?? 0
    byMarketMap.set(m, e)
  }
  const byMarket = [...byMarketMap.entries()]
    .map(([market, v]) => ({ market, ...v }))
    .sort((a, b) => b.valueCents - a.valueCents)
    .slice(0, 10)

  const monthMap = new Map<string, { airings: number; valueCents: number; impressions: number }>()
  for (const a of allAir) {
    const m = (a.airDate || '').slice(0, 7)
    if (!m) continue
    const e = monthMap.get(m) ?? { airings: 0, valueCents: 0, impressions: 0 }
    e.airings += 1
    e.valueCents += a.computedValueCents ?? 0
    e.impressions += a.impressions ?? 0
    monthMap.set(m, e)
  }
  const monthly = [...monthMap.entries()]
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-8)

  return {
    totals: {
      campaigns: allCamps.length,
      creatives: allCre.length,
      airings: allAir.length,
      impressions: totalImp,
      valueCents: totalValue,
      activeCampaigns: allCamps.filter((c) => c.status === 'active').length,
    },
    campStats: campStats.slice(0, 8),
    byMarket,
    monthly,
    recent: allAir.slice(0, 8),
    creatives: allCre,
    campaigns: allCamps,
  }
})

export const listCampaigns = createServerFn({ method: 'GET' }).handler(async () => {
  const { getDb } = await import('@/lib/db')
  const db = await getDb()
  const [allCamps, allCre, allAir] = await Promise.all([
    db.select().from(campaigns).orderBy(desc(campaigns.updatedAt)),
    db.select().from(creatives),
    db.select().from(airings),
  ])
  const airByCre = new Map<string, typeof allAir>()
  for (const a of allAir) {
    const arr = airByCre.get(a.creativeId) ?? []
    arr.push(a)
    airByCre.set(a.creativeId, arr)
  }
  return allCamps.map((camp) => {
    const cres = allCre.filter((c) => c.campaignId === camp.id)
    let imp = 0
    let val = 0
    let spots = 0
    for (const cr of cres) {
      for (const a of airByCre.get(cr.id) ?? []) {
        imp += a.impressions ?? 0
        val += a.computedValueCents ?? 0
        spots += 1
      }
    }
    return { ...camp, creativeCount: cres.length, airings: spots, impressions: imp, valueCents: val }
  })
})

export const createCampaign = createServerFn({ method: 'POST' })
  .validator((d: { name: string; sponsor?: string | null; category?: string | null; startDate?: string | null; endDate?: string | null; goalImpressions?: number; defaultCpm?: number; notes?: string | null }) => d)
  .handler(async ({ data }) => {
    if (!data.name.trim()) throw new Error('Campaign name is required')
    const { getDb } = await import('@/lib/db')
  const db = await getDb()
    const id = uid()
    const t = nowIso()
    await db.insert(campaigns).values({
      id,
      name: data.name.trim(),
      sponsor: data.sponsor?.trim() || null,
      category: data.category || null,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      goalImpressions: Math.max(0, Math.round(data.goalImpressions ?? 0)),
      defaultCpmCents: dollarsToCents(data.defaultCpm ?? 25) || 2500,
      status: 'active',
      notes: data.notes?.trim() || null,
      createdAt: t,
      updatedAt: t,
    })
    return { id }
  })

export const updateCampaign = createServerFn({ method: 'POST' })
  .validator(
    (d: { id: string; name?: string; sponsor?: string | null; category?: string | null; startDate?: string | null; endDate?: string | null; goalImpressions?: number; defaultCpm?: number; status?: string; notes?: string | null }) => d,
  )
  .handler(async ({ data }) => {
    const { getDb } = await import('@/lib/db')
  const db = await getDb()
    const ex = await db.select().from(campaigns).where(eq(campaigns.id, data.id)).get()
    if (!ex) throw new Error('Campaign not found')
    const patch: Partial<typeof campaigns.$inferInsert> = { updatedAt: nowIso() }
    if (data.name?.trim()) patch.name = data.name.trim()
    if (data.sponsor !== undefined) patch.sponsor = data.sponsor || null
    if (data.category !== undefined) patch.category = data.category || null
    if (data.startDate !== undefined) patch.startDate = data.startDate || null
    if (data.endDate !== undefined) patch.endDate = data.endDate || null
    if (data.goalImpressions !== undefined) patch.goalImpressions = Math.max(0, Math.round(data.goalImpressions))
    if (data.defaultCpm !== undefined) patch.defaultCpmCents = dollarsToCents(data.defaultCpm) || ex.defaultCpmCents
    if (data.status) patch.status = data.status
    if (data.notes !== undefined) patch.notes = data.notes || null
    await db.update(campaigns).set(patch).where(eq(campaigns.id, data.id))
    // revalue airings that used estimated CPM
    if (data.defaultCpm !== undefined) {
      const cres = await db.select().from(creatives).where(eq(creatives.campaignId, data.id))
      const cpm = patch.defaultCpmCents ?? ex.defaultCpmCents
      for (const cr of cres) {
        const ars = await db.select().from(airings).where(eq(airings.creativeId, cr.id))
        for (const a of ars) {
          if (a.rateValueCents == null) {
            await db
              .update(airings)
              .set({ computedValueCents: valueFor(a.impressions ?? 0, null, cpm) })
              .where(eq(airings.id, a.id))
          }
        }
      }
    }
    return { id: data.id }
  })

export const listCreatives = createServerFn({ method: 'GET' }).handler(async () => {
  const { getDb } = await import('@/lib/db')
  const db = await getDb()
  const [allCre, allAir, allCamps] = await Promise.all([
    db.select().from(creatives).orderBy(desc(creatives.updatedAt)),
    db.select().from(airings),
    db.select().from(campaigns),
  ])
  const campName = new Map(allCamps.map((c) => [c.id, c.name] as const))
  const airByCre = new Map<string, typeof allAir>()
  for (const a of allAir) {
    const arr = airByCre.get(a.creativeId) ?? []
    arr.push(a)
    airByCre.set(a.creativeId, arr)
  }
  return allCre.map((c) => {
    const ars = airByCre.get(c.id) ?? []
    return {
      ...c,
      campaignName: c.campaignId ? (campName.get(c.campaignId) ?? '—') : 'Unassigned',
      airings: ars.length,
      impressions: ars.reduce((s, a) => s + (a.impressions ?? 0), 0),
      valueCents: ars.reduce((s, a) => s + (a.computedValueCents ?? 0), 0),
    }
  })
})

export const createCreative = createServerFn({ method: 'POST' })
  .validator(
    (d: { title: string; campaignId?: string | null; isciCode?: string | null; durationSec?: number; language?: string; category?: string | null; notes?: string | null }) => d,
  )
  .handler(async ({ data }) => {
    if (!data.title.trim()) throw new Error('Creative title is required')
    const { getDb } = await import('@/lib/db')
  const db = await getDb()
    const id = uid()
    const t = nowIso()
    await db.insert(creatives).values({
      id,
      campaignId: data.campaignId || null,
      title: data.title.trim(),
      isciCode: data.isciCode?.trim().toUpperCase() || null,
      durationSec: data.durationSec ?? 30,
      language: data.language || 'English',
      category: data.category || null,
      status: 'active',
      notes: data.notes?.trim() || null,
      createdAt: t,
      updatedAt: t,
    })
    return { id }
  })

export const updateCreative = createServerFn({ method: 'POST' })
  .validator(
    (d: { id: string; title?: string; campaignId?: string | null; isciCode?: string | null; durationSec?: number; language?: string; category?: string | null; status?: string; notes?: string | null }) => d,
  )
  .handler(async ({ data }) => {
    const { getDb } = await import('@/lib/db')
  const db = await getDb()
    const ex = await db.select().from(creatives).where(eq(creatives.id, data.id)).get()
    if (!ex) throw new Error('Creative not found')
    await db
      .update(creatives)
      .set({
        title: data.title?.trim() || ex.title,
        campaignId: data.campaignId !== undefined ? data.campaignId || null : ex.campaignId,
        isciCode: data.isciCode !== undefined ? data.isciCode?.toUpperCase() || null : ex.isciCode,
        durationSec: data.durationSec ?? ex.durationSec,
        language: data.language ?? ex.language,
        category: data.category !== undefined ? data.category || null : ex.category,
        status: data.status ?? ex.status,
        notes: data.notes !== undefined ? data.notes || null : ex.notes,
        updatedAt: nowIso(),
      })
      .where(eq(creatives.id, data.id))
    return { id: data.id }
  })

const airingInput = z.object({
  creativeId: z.string().min(1),
  station: z.string().min(1, 'Station is required'),
  market: z.string().optional().default(''),
  airDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  airTime: z.string().optional().default(''),
  program: z.string().optional().default(''),
  daypart: z.string().optional().default(''),
  durationSec: z.number().int().min(5).max(300).default(30),
  impressions: z.number().int().min(0).default(0),
  rateValue: z.number().min(0).nullable().optional(),
})

export const createAiring = createServerFn({ method: 'POST' })
  .validator((d: z.infer<typeof airingInput>) => airingInput.parse(d))
  .handler(async ({ data }) => {
    const { getDb } = await import('@/lib/db')
  const db = await getDb()
    const cr = await db.select().from(creatives).where(eq(creatives.id, data.creativeId)).get()
    if (!cr) throw new Error('Pick a creative first')
    let baseCpm = 2500
    if (cr.campaignId) {
      const camp = await db.select().from(campaigns).where(eq(campaigns.id, cr.campaignId)).get()
      if (camp) baseCpm = camp.defaultCpmCents ?? 2500
    }
    const rateCents = data.rateValue != null ? Math.round(data.rateValue * 100) : null
    const market = data.market?.trim() || ''
    const { cpm: resolvedCpm } = await resolveCpm(db, market, data.daypart?.trim() || '', baseCpm)
    await db.insert(airings).values({
      id: uid(),
      creativeId: data.creativeId,
      station: data.station.trim().toUpperCase(),
      market,
      marketRank: dmaRankFor(market),
      airDate: data.airDate,
      airTime: data.airTime?.trim() || '',
      program: data.program?.trim() || '',
      daypart: data.daypart?.trim() || '',
      durationSec: data.durationSec,
      impressions: data.impressions,
      rateValueCents: rateCents,
      computedValueCents: valueFor(data.impressions, rateCents, resolvedCpm),
      cpmUsedCents: rateCents != null && rateCents > 0 ? null : resolvedCpm,
      source: 'manual',
      createdAt: nowIso(),
    })
    return { ok: true }
  })

export const listAirings = createServerFn({ method: 'GET' })
  .validator((d: { creativeId?: string; limit?: number }) => d)
  .handler(async ({ data }: { data?: { creativeId?: string; limit?: number } }) => {
    const { getDb } = await import('@/lib/db')
  const db = await getDb()
    const lim = (data as { limit?: number } | undefined)?.limit ?? 500
    const all = await db.select().from(airings).orderBy(desc(airings.airDate)).limit(lim)
    const filtered = (data as { creativeId?: string } | undefined)?.creativeId ? all.filter((a) => a.creativeId === (data as { creativeId?: string }).creativeId) : all
    const cres = await db.select().from(creatives)
    const name = new Map(cres.map((c) => [c.id, c.title] as const))
    return filtered.map((a) => ({ ...a, creativeTitle: name.get(a.creativeId) ?? '—' }))
  })

export const importAirings = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      defaultCreativeId?: string | null
      rows: { station: string; market: string; airDate: string; airTime: string; program: string; daypart: string; durationSec: number; impressions: number; rateValue: number | null; creativeTitle: string; isci: string }[]
    }) => d,
  )
  .handler(async ({ data }) => {
    if (!data.rows.length) throw new Error('No rows to import')
    if (data.rows.length > 2000) throw new Error('Limit imports to 2,000 rows at a time')
    const { getDb } = await import('@/lib/db')
  const db = await getDb()
    const allCre = await db.select().from(creatives)
    const allCamps = await db.select().from(campaigns)
    const byTitle = new Map(allCre.map((c) => [c.title.toLowerCase(), c] as const))
    const byIsci = new Map(allCre.filter((c) => c.isciCode).map((c) => [(c.isciCode as string).toUpperCase(), c] as const))
    let defaultCre = data.defaultCreativeId
      ? ((await db.select().from(creatives).where(eq(creatives.id, data.defaultCreativeId)).get()) ?? null)
      : null
    let imported = 0
    const skipped: string[] = []
    for (let i = 0; i < data.rows.length; i++) {
      const r = data.rows[i]
      if (!r.station || !/^\d{4}-\d{2}-\d{2}$/.test(r.airDate || '')) {
        skipped.push(`Row ${i + 2}: bad station/date`)
        continue
      }
      let cre = defaultCre
      if (!cre && (r.creativeTitle || r.isci)) {
        cre =
          (r.isci ? byIsci.get(r.isci.toUpperCase()) : undefined) ??
          (r.creativeTitle ? byTitle.get(r.creativeTitle.toLowerCase()) : undefined) ??
          null
        if (!cre && r.creativeTitle) {
          const id = uid()
          const t = nowIso()
          const nc = {
            id,
            campaignId: null as string | null,
            title: r.creativeTitle,
            isciCode: r.isci || null,
            durationSec: r.durationSec || 30,
            language: 'English',
            category: null as string | null,
            status: 'active',
            notes: 'Auto-created by Nielsen import' as string | null,
            createdAt: t,
            updatedAt: t,
          }
          await db.insert(creatives).values(nc)
          cre = nc as typeof allCre[number]
          byTitle.set(nc.title.toLowerCase(), cre)
          if (nc.isciCode) byIsci.set(nc.isciCode.toUpperCase(), cre)
        }
      }
      if (!cre) {
        skipped.push(`Row ${i + 2}: no creative matched`)
        continue
      }
      let baseCpm = 2500
      if (cre.campaignId) {
        const camp = allCamps.find((c) => c.id === cre.campaignId)
        if (camp) baseCpm = camp.defaultCpmCents ?? 2500
      }
      const rateCents = r.rateValue != null && r.rateValue > 0 ? Math.round(r.rateValue * 100) : null
      const market = (r.market || '').trim()
      const { cpm: resolvedCpm } = await resolveCpm(db, market, (r.daypart || '').trim(), baseCpm)
      await db.insert(airings).values({
        id: uid(),
        creativeId: cre.id,
        station: r.station.toUpperCase(),
        market,
        marketRank: dmaRankFor(market),
        airDate: r.airDate,
        airTime: r.airTime || '',
        program: r.program || '',
        daypart: r.daypart || '',
        durationSec: r.durationSec || 30,
        impressions: Math.max(0, Math.round(r.impressions || 0)),
        rateValueCents: rateCents,
        computedValueCents: valueFor(r.impressions || 0, rateCents, resolvedCpm),
        cpmUsedCents: rateCents != null && rateCents > 0 ? null : resolvedCpm,
        source: 'nielsen',
        createdAt: nowIso(),
      })
      imported += 1
    }
    return { imported, skipped }
  })

export const getCampaignReport = createServerFn({ method: 'GET' })
  .validator((d: { campaignId: string }) => d)
  .handler(async ({ data }) => {
    const { getDb } = await import('@/lib/db')
  const db = await getDb()
    const camp = await db.select().from(campaigns).where(eq(campaigns.id, data.campaignId)).get()
    if (!camp) throw new Error('Campaign not found')
    const cres = await db.select().from(creatives).where(eq(creatives.campaignId, data.campaignId))
    const allAir = await db.select().from(airings)
    const mine = allAir.filter((a) => cres.some((c) => c.id === a.creativeId))
    const totals = { airings: mine.length, impressions: mine.reduce((s, a) => s + (a.impressions ?? 0), 0), value: mine.reduce((s, a) => s + (a.computedValueCents ?? 0), 0) }
    const byCreative = cres.map((c) => {
      const ars = mine.filter((a) => a.creativeId === c.id)
      return { creativeId: c.id, title: c.title, airings: ars.length, impressions: ars.reduce((s, a) => s + (a.impressions ?? 0), 0), value: ars.reduce((s, a) => s + (a.computedValueCents ?? 0), 0) }
    }).sort((a, b) => b.value - a.value)
    const mMap = new Map<string, { airings: number; impressions: number; value: number }>()
    for (const a of mine) {
      const m = (a.market || 'Unknown').trim() || 'Unknown'
      const e = mMap.get(m) ?? { airings: 0, impressions: 0, value: 0 }
      e.airings += 1; e.impressions += a.impressions ?? 0; e.value += a.computedValueCents ?? 0
      mMap.set(m, e)
    }
    const byMarket = [...mMap.entries()].map(([market, v]) => ({ market, ...v })).sort((a, b) => b.value - a.value)
    return { campaign: camp, totals, byCreative, byMarket }
  })

export const getCreativeReport = createServerFn({ method: 'GET' })
  .validator((d: { creativeId: string }) => d)
  .handler(async ({ data }) => {
    const { getDb } = await import('@/lib/db')
  const db = await getDb()
    const cr = await db.select().from(creatives).where(eq(creatives.id, data.creativeId)).get()
    if (!cr) throw new Error('Creative not found')
    let campaignName: string | null = null
    if (cr.campaignId) {
      const camp = await db.select().from(campaigns).where(eq(campaigns.id, cr.campaignId)).get()
      campaignName = camp?.name ?? null
    }
    const ars = await db.select().from(airings).where(eq(airings.creativeId, data.creativeId))
    const totals = { airings: ars.length, impressions: ars.reduce((s, a) => s + (a.impressions ?? 0), 0), value: ars.reduce((s, a) => s + (a.computedValueCents ?? 0), 0) }
    const dMap = new Map<string, { airings: number; impressions: number; value: number }>()
    const mMap = new Map<string, { airings: number; impressions: number; value: number }>()
    for (const a of ars) {
      const dp = (a.daypart || 'Unspecified').trim() || 'Unspecified'
      const de = dMap.get(dp) ?? { airings: 0, impressions: 0, value: 0 }
      de.airings += 1; de.impressions += a.impressions ?? 0; de.value += a.computedValueCents ?? 0
      dMap.set(dp, de)
      const m = (a.market || 'Unknown').trim() || 'Unknown'
      const me = mMap.get(m) ?? { airings: 0, impressions: 0, value: 0 }
      me.airings += 1; me.impressions += a.impressions ?? 0; me.value += a.computedValueCents ?? 0
      mMap.set(m, me)
    }
    return {
      creative: { ...cr, campaignName },
      totals,
      byDaypart: [...dMap.entries()].map(([daypart, v]) => ({ daypart, ...v })).sort((a, b) => b.value - a.value),
      byMarket: [...mMap.entries()].map(([market, v]) => ({ market, ...v })).sort((a, b) => b.value - a.value),
      recent: [...ars].sort((a, b) => (b.airDate || '').localeCompare(a.airDate || '')).slice(0, 50).map((a) => ({ ...a, computedValue: a.computedValueCents ?? 0 })),
    }
  })

export const deleteAiring = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { getDb } = await import('@/lib/db')
  const db = await getDb()
    await db.delete(airings).where(eq(airings.id, data.id))
    return { id: data.id }
  })

export const getReports = createServerFn({ method: 'GET' }).handler(async () => {
  const { getDb } = await import('@/lib/db')
  const db = await getDb()
  const [allCamps, allCre, allAir] = await Promise.all([
    db.select().from(campaigns).orderBy(asc(campaigns.name)),
    db.select().from(creatives).orderBy(asc(creatives.title)),
    db.select().from(airings),
  ])
  const airByCre = new Map<string, typeof allAir>()
  for (const a of allAir) {
    const arr = airByCre.get(a.creativeId) ?? []
    arr.push(a)
    airByCre.set(a.creativeId, arr)
  }
  const creativeRows = allCre.map((c) => {
    const ars = airByCre.get(c.id) ?? []
    const byDay = new Map<string, number>()
    for (const a of ars) byDay.set(a.daypart || 'Unspecified', (byDay.get(a.daypart || 'Unspecified') ?? 0) + 1)
    return {
      ...c,
      airings: ars.length,
      impressions: ars.reduce((s, a) => s + (a.impressions ?? 0), 0),
      valueCents: ars.reduce((s, a) => s + (a.computedValueCents ?? 0), 0),
      topDaypart: [...byDay.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—',
    }
  })
  const campaignRows = allCamps.map((camp) => {
    const cres = allCre.filter((c) => c.campaignId === camp.id)
    let imp = 0
    let val = 0
    let spots = 0
    for (const cr of cres) {
      for (const a of airByCre.get(cr.id) ?? []) {
        imp += a.impressions ?? 0
        val += a.computedValueCents ?? 0
        spots += 1
      }
    }
    const progress = camp.goalImpressions > 0 ? Math.min(100, Math.round((imp / camp.goalImpressions) * 100)) : 0
    return { ...camp, creatives: cres.length, airings: spots, impressions: imp, valueCents: val, progress }
  })
  return { creativeRows, campaignRows }
})
