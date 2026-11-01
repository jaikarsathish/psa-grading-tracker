// Drizzle schema for PSA donated-media tracking (public service announcements)
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export * from './auth-schema'

// Legacy card-grading tables (kept for compatibility, no longer used by UI)
export const submissions = sqliteTable('submissions', {
  id: text('id').primaryKey(),
  submissionNumber: text('submission_number').notNull(),
  title: text('title').notNull(),
  serviceLevel: text('service_level').notNull(),
  status: text('status').notNull().default('prepping'),
  trackingNumber: text('tracking_number'),
  returnTrackingNumber: text('return_tracking_number'),
  sentDate: text('sent_date'),
  receivedDate: text('received_date'),
  expectedReturnDate: text('expected_return_date'),
  returnedDate: text('returned_date'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const submissionCards = sqliteTable('submission_cards', {
  id: text('id').primaryKey(),
  submissionId: text('submission_id').notNull(),
  year: text('year').notNull(),
  brand: text('brand').notNull(),
  cardName: text('card_name').notNull(),
  playerName: text('player_name').notNull(),
  cardNumber: text('card_number'),
  declaredValue: integer('declared_value').notNull().default(0),
  grade: integer('grade'),
  gradedValue: integer('graded_value'),
  certNumber: text('cert_number'),
  createdAt: text('created_at').notNull(),
})

export const statusEvents = sqliteTable('status_events', {
  id: text('id').primaryKey(),
  submissionId: text('submission_id').notNull(),
  status: text('status').notNull(),
  note: text('note').notNull(),
  createdAt: text('created_at').notNull(),
})

// --- PSA donated media ---
export const campaigns = sqliteTable('campaigns', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sponsor: text('sponsor'),
  category: text('category'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  goalImpressions: integer('goal_impressions').notNull().default(0),
  defaultCpmCents: integer('default_cpm_cents').notNull().default(2500),
  status: text('status').notNull().default('active'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const creatives = sqliteTable('creatives', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id'),
  title: text('title').notNull(),
  isciCode: text('isci_code'),
  durationSec: integer('duration_sec').notNull().default(30),
  language: text('language').notNull().default('English'),
  category: text('category'),
  status: text('status').notNull().default('active'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const airings = sqliteTable('airings', {
  id: text('id').primaryKey(),
  creativeId: text('creative_id').notNull(),
  station: text('station').notNull(),
  market: text('market').notNull().default(''),
  marketRank: integer('market_rank'),
  airDate: text('air_date').notNull(),
  airTime: text('air_time').notNull().default(''),
  program: text('program').notNull().default(''),
  daypart: text('daypart').notNull().default(''),
  durationSec: integer('duration_sec').notNull().default(30),
  impressions: integer('impressions').notNull().default(0),
  rateValueCents: integer('rate_value_cents'),
  computedValueCents: integer('computed_value_cents').notNull().default(0),
  cpmUsedCents: integer('cpm_used_cents'),
  source: text('source').notNull().default('manual'),
  createdAt: text('created_at').notNull(),
})

export const teamMembers = sqliteTable('team_members', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').notNull().default('viewer'),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull(),
})

export const cpmRates = sqliteTable('cpm_rates', {
  id: text('id').primaryKey(),
  market: text('market').notNull(),
  daypart: text('daypart').notNull().default('*'),
  cpmCents: integer('cpm_cents').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export type Submission = typeof submissions.$inferSelect
export type SubmissionCard = typeof submissionCards.$inferSelect
export type StatusEvent = typeof statusEvents.$inferSelect
export type Campaign = typeof campaigns.$inferSelect
export type Creative = typeof creatives.$inferSelect
export type Airing = typeof airings.$inferSelect
