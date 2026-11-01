CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sponsor TEXT,
  category TEXT,
  start_date TEXT,
  end_date TEXT,
  goal_impressions INTEGER NOT NULL DEFAULT 0,
  default_cpm_cents INTEGER NOT NULL DEFAULT 2500,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS creatives (
  id TEXT PRIMARY KEY,
  campaign_id TEXT,
  title TEXT NOT NULL,
  isci_code TEXT,
  duration_sec INTEGER NOT NULL DEFAULT 30,
  language TEXT NOT NULL DEFAULT 'English',
  category TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS airings (
  id TEXT PRIMARY KEY,
  creative_id TEXT NOT NULL,
  station TEXT NOT NULL,
  market TEXT NOT NULL DEFAULT '',
  air_date TEXT NOT NULL,
  air_time TEXT NOT NULL DEFAULT '',
  program TEXT NOT NULL DEFAULT '',
  daypart TEXT NOT NULL DEFAULT '',
  duration_sec INTEGER NOT NULL DEFAULT 30,
  impressions INTEGER NOT NULL DEFAULT 0,
  rate_value_cents INTEGER,
  computed_value_cents INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL
);
INSERT OR IGNORE INTO campaigns (id, name, sponsor, category, start_date, end_date, goal_impressions, default_cpm_cents, status, notes, created_at, updated_at) VALUES
('seed-camp-1', 'Wildfire Safety 2026', 'CA Fire Foundation', 'Safety', '2026-06-01', '2026-10-31', 5000000, 2500, 'active', 'Summer wildfire preparedness flight.', '2026-06-01T10:00:00.000Z', '2026-10-20T10:00:00.000Z'),
('seed-camp-2', 'Youth Vaping Prevention', 'ClearAir Alliance', 'Health', '2026-09-01', '2026-12-31', 8000000, 2800, 'active', 'Back-to-school prevention push.', '2026-09-01T10:00:00.000Z', '2026-10-28T10:00:00.000Z');
INSERT OR IGNORE INTO creatives (id, campaign_id, title, isci_code, duration_sec, language, category, status, notes, created_at, updated_at) VALUES
('seed-cr-1', 'seed-camp-1', 'Defensible Space :30', 'WFSA2630H', 30, 'English', 'Safety', 'active', 'Hero family spot.', '2026-06-01T10:00:00.000Z', '2026-06-01T10:00:00.000Z'),
('seed-cr-2', 'seed-camp-1', 'Espacio Defendible :30', 'WFSA2630S', 30, 'Spanish', 'Safety', 'active', 'Spanish version.', '2026-06-01T10:00:00.000Z', '2026-06-01T10:00:00.000Z'),
('seed-cr-3', 'seed-camp-2', 'Vape Free Future :60', 'YVPF6060E', 60, 'English', 'Health', 'active', 'Teen testimonial cut.', '2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z');
INSERT OR IGNORE INTO airings (id, creative_id, station, market, air_date, air_time, program, daypart, duration_sec, impressions, rate_value_cents, computed_value_cents, source, created_at) VALUES
('seed-air-1', 'seed-cr-1', 'KPIX-TV', 'San Francisco-Oak-San Jose', '2026-10-12', '18:23', 'Evening News', 'Early Evening', 30, 84200, 210500, 210500, 'nielsen', '2026-10-13T10:00:00.000Z'),
('seed-air-2', 'seed-cr-1', 'KCBS-TV', 'Los Angeles', '2026-10-12', '06:12', 'Morning News', 'Early Morning', 30, 61300, 153250, 153250, 'nielsen', '2026-10-13T10:00:00.000Z'),
('seed-air-3', 'seed-cr-2', 'KMEX-TV', 'Los Angeles', '2026-10-13', '20:45', 'Noticias', 'Prime', 30, 95400, 238500, 238500, 'nielsen', '2026-10-14T10:00:00.000Z'),
('seed-air-4', 'seed-cr-3', 'WABC-TV', 'New York', '2026-10-14', '07:30', 'GMA', 'Early Morning', 60, 121000, 338800, 338800, 'nielsen', '2026-10-15T10:00:00.000Z'),
('seed-air-5', 'seed-cr-3', 'WLS-TV', 'Chicago', '2026-10-15', '22:10', 'Late News', 'Late Night', 60, 58700, 164360, 164360, 'nielsen', '2026-10-16T10:00:00.000Z');
