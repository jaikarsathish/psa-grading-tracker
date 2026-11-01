import { createServerFn } from '@tanstack/react-start'
import { asc, desc, eq, like, or } from 'drizzle-orm'
import { statusEvents, submissionCards, submissions } from '@/db/schema'
import { getDb } from '@/lib/db'
import { SERVICE_LEVELS, STATUSES, STATUS_LABELS } from '@/lib/psa-constants'

function uid() {
  return crypto.randomUUID()
}
function nowIso() {
  return new Date().toISOString()
}
function dollarsToCents(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : 0
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n * 100)
}

export const getDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  const db = await getDb()
  const allSubs = await db.select().from(submissions).orderBy(desc(submissions.updatedAt))
  const allCards = await db.select().from(submissionCards)
  const allEvents = await db.select().from(statusEvents).orderBy(desc(statusEvents.createdAt)).limit(8)

  const cardsBySub = new Map<string, typeof allCards>()
  for (const c of allCards) {
    const arr = cardsBySub.get(c.submissionId) ?? []
    arr.push(c)
    cardsBySub.set(c.submissionId, arr)
  }

  const totalDeclared = allCards.reduce((s, c) => s + (c.declaredValue ?? 0), 0)
  const totalGraded = allCards.reduce((s, c) => s + (c.gradedValue ?? 0), 0)
  const gradedCards = allCards.filter((c) => c.grade != null)
  const avgGrade = gradedCards.length
    ? gradedCards.reduce((s, c) => s + (c.grade ?? 0), 0) / gradedCards.length
    : 0
  const inFlight = allSubs.filter((s) => s.status !== 'returned').length

  const byStatus = STATUSES.map((st) => ({
    status: st as string,
    count: allSubs.filter((s) => s.status === st).length,
  }))

  const gradeDist: { grade: string; count: number }[] = []
  for (let g = 1; g <= 10; g++) {
    const count = allCards.filter((c) => c.grade === g).length
    if (count > 0 || g === 10 || g === 9) gradeDist.push({ grade: `PSA ${g}`, count })
  }

  const subsWithCounts = allSubs.slice(0, 20).map((s) => ({
    ...s,
    cardCount: (cardsBySub.get(s.id) ?? []).length,
    declaredTotal: (cardsBySub.get(s.id) ?? []).reduce((x, c) => x + (c.declaredValue ?? 0), 0),
  }))

  return {
    stats: {
      totalSubs: allSubs.length,
      totalCards: allCards.length,
      inFlight,
      avgGrade: Math.round(avgGrade * 100) / 100,
      totalDeclared,
      totalGraded,
      uplift: totalGraded - totalDeclared,
    },
    byStatus,
    gradeDist,
    recent: subsWithCounts.slice(0, 6),
    all: subsWithCounts,
    events: allEvents,
  }
})

export const getAnalytics = createServerFn({ method: 'GET' }).handler(async () => {
  const db = await getDb()
  const allSubs = await db.select().from(submissions)
  const allCards = await db.select().from(submissionCards)
  const graded = allCards.filter((c) => c.grade != null)
  const avgGrade = graded.length ? graded.reduce((s, c) => s + (c.grade ?? 0), 0) / graded.length : 0
  const gemCount = allCards.filter((c) => c.grade === 10).length

  const distMap = new Map<number, number>()
  for (const c of graded) distMap.set(c.grade ?? 0, (distMap.get(c.grade ?? 0) ?? 0) + 1)
  const gradeDist = [...distMap.entries()]
    .filter(([g]) => g >= 1 && g <= 10)
    .sort((a, b) => a[0] - b[0])
    .map(([grade, count]) => ({ grade, label: `PSA ${grade}`, count }))

  const byService = new Map<string, { totalDays: number; n: number }>()
  for (const s of allSubs) {
    if (!s.sentDate || !s.returnedDate) continue
    const a = new Date(s.sentDate).getTime()
    const b = new Date(s.returnedDate).getTime()
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) continue
    const days = Math.round((b - a) / 86400000)
    const e = byService.get(s.serviceLevel) ?? { totalDays: 0, n: 0 }
    e.totalDays += days
    e.n += 1
    byService.set(s.serviceLevel, e)
  }
  const turnaround = [...byService.entries()].map(([serviceLevel, v]) => ({
    serviceLevel,
    days: Math.round((v.totalDays / Math.max(1, v.n)) * 10) / 10,
    count: v.n,
  }))

  const uplift = graded
    .filter((c) => (c.gradedValue ?? 0) > 0)
    .map((c) => ({
      id: c.id,
      playerName: c.playerName,
      cardName: c.cardName,
      grade: c.grade ?? 0,
      declaredValue: c.declaredValue ?? 0,
      gradedValue: c.gradedValue ?? 0,
    }))
    .sort((a, b) => b.gradedValue - b.declaredValue - (a.gradedValue - a.declaredValue))
    .slice(0, 30)

  return {
    total: graded.length,
    avgGrade: Math.round(avgGrade * 100) / 100,
    gemCount,
    gemRate: graded.length ? Math.round((gemCount / graded.length) * 100) : 0,
    gradeDist,
    turnaround,
    uplift,
  }
})

export const listSubmissions = createServerFn({ method: 'GET' }).handler(async () => {
  const db = await getDb()
  const allSubs = await db.select().from(submissions).orderBy(desc(submissions.updatedAt))
  const allCards = await db.select().from(submissionCards)
  const map = new Map<string, number>()
  for (const c of allCards) map.set(c.submissionId, (map.get(c.submissionId) ?? 0) + 1)
  return allSubs.map((s) => ({ ...s, cardCount: map.get(s.id) ?? 0 }))
})

export const getSubmissionDetail = createServerFn({ method: 'GET' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const db = await getDb()
    const sub = await db.select().from(submissions).where(eq(submissions.id, data.id)).get()
    if (!sub) throw new Error('Submission not found')
    const cards = await db
      .select()
      .from(submissionCards)
      .where(eq(submissionCards.submissionId, data.id))
      .orderBy(asc(submissionCards.createdAt))
    const events = await db
      .select()
      .from(statusEvents)
      .where(eq(statusEvents.submissionId, data.id))
      .orderBy(asc(statusEvents.createdAt))
    return { submission: sub, cards, events }
  })

export const lookupSubmission = createServerFn({ method: 'GET' })
  .validator((d: { query: string }) => d)
  .handler(async ({ data }) => {
    const q = data.query.trim()
    if (!q) return null
    const db = await getDb()
    const all = await db.select().from(submissions)
    const low = q.toLowerCase()
    const found =
      all.find((s) => s.submissionNumber.toLowerCase() === low) ??
      all.find((s) => (s.trackingNumber ?? '').toLowerCase() === low) ??
      all.find((s) => (s.returnTrackingNumber ?? '').toLowerCase() === low) ??
      all.find((s) => s.submissionNumber.toLowerCase().includes(low))
    if (!found) return null
    const cards = await db.select().from(submissionCards).where(eq(submissionCards.submissionId, found.id))
    const events = await db
      .select()
      .from(statusEvents)
      .where(eq(statusEvents.submissionId, found.id))
      .orderBy(asc(statusEvents.createdAt))
    return { submission: found, cards, events }
  })

export const createSubmission = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      title: string
      submissionNumber: string
      serviceLevel: string
      status?: string
      trackingNumber?: string
      sentDate?: string
      expectedReturnDate?: string
      notes?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    if (!data.title.trim()) throw new Error('Give the submission a title')
    if (!data.submissionNumber.trim()) throw new Error('Submission number is required')
    const db = await getDb()
    const id = uid()
    const t = nowIso()
    const status = data.status || 'prepping'
    await db.insert(submissions).values({
      id,
      submissionNumber: data.submissionNumber.trim(),
      title: data.title.trim(),
      serviceLevel: data.serviceLevel || SERVICE_LEVELS[0],
      status,
      trackingNumber: data.trackingNumber?.trim() || null,
      returnTrackingNumber: null,
      sentDate: data.sentDate || null,
      receivedDate: null,
      expectedReturnDate: data.expectedReturnDate || null,
      returnedDate: null,
      notes: data.notes?.trim() || null,
      createdAt: t,
      updatedAt: t,
    })
    await db.insert(statusEvents).values({
      id: uid(),
      submissionId: id,
      status,
      note: 'Submission created.',
      createdAt: t,
    })
    return { id }
  })

export const updateSubmission = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      id: string
      title?: string
      serviceLevel?: string
      status?: string
      trackingNumber?: string | null
      returnTrackingNumber?: string | null
      sentDate?: string | null
      receivedDate?: string | null
      expectedReturnDate?: string | null
      returnedDate?: string | null
      notes?: string | null
      timelineNote?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const db = await getDb()
    const existing = await db.select().from(submissions).where(eq(submissions.id, data.id)).get()
    if (!existing) throw new Error('Submission not found')
    const t = nowIso()
    const nextStatus = data.status ?? existing.status
    await db
      .update(submissions)
      .set({
        title: data.title?.trim() || existing.title,
        serviceLevel: data.serviceLevel ?? existing.serviceLevel,
        status: nextStatus,
        trackingNumber: data.trackingNumber !== undefined ? data.trackingNumber || null : existing.trackingNumber,
        returnTrackingNumber:
          data.returnTrackingNumber !== undefined ? data.returnTrackingNumber || null : existing.returnTrackingNumber,
        sentDate: data.sentDate !== undefined ? data.sentDate || null : existing.sentDate,
        receivedDate: data.receivedDate !== undefined ? data.receivedDate || null : existing.receivedDate,
        expectedReturnDate:
          data.expectedReturnDate !== undefined ? data.expectedReturnDate || null : existing.expectedReturnDate,
        returnedDate: data.returnedDate !== undefined ? data.returnedDate || null : existing.returnedDate,
        notes: data.notes !== undefined ? data.notes || null : existing.notes,
        updatedAt: t,
      })
      .where(eq(submissions.id, data.id))
    if (nextStatus !== existing.status || data.timelineNote?.trim()) {
      await db.insert(statusEvents).values({
        id: uid(),
        submissionId: data.id,
        status: nextStatus,
        note: data.timelineNote?.trim() || `Status changed to ${STATUS_LABELS[nextStatus] ?? nextStatus}.`,
        createdAt: t,
      })
    }
    return { id: data.id }
  })

export const deleteSubmission = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const db = await getDb()
    const cards = await db.select().from(submissionCards).where(eq(submissionCards.submissionId, data.id))
    for (const c of cards) await db.delete(submissionCards).where(eq(submissionCards.id, c.id))
    const evs = await db.select().from(statusEvents).where(eq(statusEvents.submissionId, data.id))
    for (const e of evs) await db.delete(statusEvents).where(eq(statusEvents.id, e.id))
    await db.delete(submissions).where(eq(submissions.id, data.id))
    return { id: data.id }
  })

export const createCard = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      submissionId: string
      year: string
      brand: string
      cardName: string
      playerName: string
      cardNumber?: string
      declaredValue: number
    }) => d,
  )
  .handler(async ({ data }) => {
    if (!data.playerName.trim() || !data.cardName.trim()) throw new Error('Player and card name are required')
    const db = await getDb()
    const id = uid()
    await db.insert(submissionCards).values({
      id,
      submissionId: data.submissionId,
      year: data.year.trim() || '—',
      brand: data.brand.trim() || '—',
      cardName: data.cardName.trim(),
      playerName: data.playerName.trim(),
      cardNumber: data.cardNumber?.trim() || null,
      declaredValue: dollarsToCents(data.declaredValue),
      grade: null,
      gradedValue: null,
      certNumber: null,
      createdAt: nowIso(),
    })
    await db.update(submissions).set({ updatedAt: nowIso() }).where(eq(submissions.id, data.submissionId))
    return { id }
  })

export const updateCardGrade = createServerFn({ method: 'POST' })
  .validator(
    (d: { id: string; grade?: number | null; gradedValue?: number | null; certNumber?: string | null; declaredValue?: number }) =>
      d,
  )
  .handler(async ({ data }) => {
    const db = await getDb()
    const existing = await db.select().from(submissionCards).where(eq(submissionCards.id, data.id)).get()
    if (!existing) throw new Error('Card not found')
    if (data.grade != null && (data.grade < 1 || data.grade > 10)) throw new Error('Grade must be 1–10')
    await db
      .update(submissionCards)
      .set({
        grade: data.grade ?? null,
        gradedValue: data.gradedValue != null ? Math.max(0, Math.round(data.gradedValue * 100)) : null,
        certNumber: data.certNumber?.trim() || null,
        declaredValue: data.declaredValue != null ? Math.max(0, Math.round(data.declaredValue * 100)) : existing.declaredValue,
      })
      .where(eq(submissionCards.id, data.id))
    return { id: data.id }
  })

export const deleteCard = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const db = await getDb()
    await db.delete(submissionCards).where(eq(submissionCards.id, data.id))
    return { id: data.id }
  })

export const addTimelineNote = createServerFn({ method: 'POST' })
  .validator((d: { submissionId: string; note: string }) => d)
  .handler(async ({ data }) => {
    if (!data.note.trim()) throw new Error('Write a note first')
    const db = await getDb()
    const sub = await db.select().from(submissions).where(eq(submissions.id, data.submissionId)).get()
    if (!sub) throw new Error('Submission not found')
    await db.insert(statusEvents).values({
      id: uid(),
      submissionId: data.submissionId,
      status: sub.status,
      note: data.note.trim(),
      createdAt: nowIso(),
    })
    return { submissionId: data.submissionId }
  })

export const searchAll = createServerFn({ method: 'GET' })
  .validator((d: { q: string }) => d)
  .handler(async ({ data }) => {
    const db = await getDb()
    const q = `%${data.q}%`
    const subs = await db
      .select()
      .from(submissions)
      .where(or(like(submissions.title, q), like(submissions.submissionNumber, q), like(submissions.trackingNumber, q)))
      .orderBy(desc(submissions.updatedAt))
      .limit(20)
    return subs
  })
