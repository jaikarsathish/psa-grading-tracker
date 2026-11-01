CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  submission_number TEXT NOT NULL,
  title TEXT NOT NULL,
  service_level TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'prepping',
  tracking_number TEXT,
  return_tracking_number TEXT,
  sent_date TEXT,
  received_date TEXT,
  expected_return_date TEXT,
  returned_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS submission_cards (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  year TEXT NOT NULL,
  brand TEXT NOT NULL,
  card_name TEXT NOT NULL,
  player_name TEXT NOT NULL,
  card_number TEXT,
  declared_value INTEGER NOT NULL DEFAULT 0,
  grade INTEGER,
  graded_value INTEGER,
  cert_number TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS status_events (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL
);
INSERT OR IGNORE INTO submissions (id, submission_number, title, service_level, status, tracking_number, sent_date, received_date, expected_return_date, notes, created_at, updated_at) VALUES
('seed-sub-1', 'PSA-88410231', 'March Modern Basketball Bulk', 'Value Bulk', 'grading', '1Z88410231WQ', '2026-09-18', '2026-09-24', '2026-11-25', 'Mostly Luka / Wemby base + 2 prizms for grading.', '2026-09-18T10:00:00.000Z', '2026-10-20T10:00:00.000Z'),
('seed-sub-2', 'PSA-88410987', 'Vintage Football Express', 'Express', 'returned', '1Z88410987AA', '2026-08-02', '2026-08-06', '2026-09-01', '1971 Topps Bradshaw + 3 more vintage. All slabbed back.', '2026-08-02T10:00:00.000Z', '2026-08-28T10:00:00.000Z'),
('seed-sub-3', 'PSA-88411502', 'TCG October Special', 'Value TCG Bulk', 'prepping', NULL, NULL, NULL, NULL, 'Prepping 40 cards for Nov special. Sleeved and in Card Saver Is.', '2026-10-28T10:00:00.000Z', '2026-10-28T10:00:00.000Z');
INSERT OR IGNORE INTO submission_cards (id, submission_id, year, brand, card_name, player_name, card_number, declared_value, grade, graded_value, cert_number, created_at) VALUES
('seed-card-1', 'seed-sub-1', '2023', 'Panini Prizm', 'Base Silver', 'Victor Wembanyama', '#136', 4999, 10, 18500, '148203991', '2026-09-18T10:00:00.000Z'),
('seed-card-2', 'seed-sub-1', '2018', 'Panini Donruss', 'Rated Rookie', 'Luka Doncic', '#177', 2999, 9, 4500, '148203992', '2026-09-18T10:00:00.000Z'),
('seed-card-3', 'seed-sub-1', '2020', 'Topps Chrome', 'Refractor', 'Joe Burrow', '#142', 1999, NULL, NULL, NULL, '2026-09-18T10:00:00.000Z'),
('seed-card-4', 'seed-sub-2', '1971', 'Topps', 'Rookie', 'Terry Bradshaw', '#156', 80000, 6, 92500, '147990201', '2026-08-02T10:00:00.000Z'),
('seed-card-5', 'seed-sub-2', '1972', 'Topps', 'Base', 'Roger Staubach', '#200', 15000, 7, 18200, '147990202', '2026-08-02T10:00:00.000Z'),
('seed-card-6', 'seed-sub-3', '1999', 'Pokemon Base', 'Charizard Holo', 'Charizard', '#4/102', 49900, NULL, NULL, NULL, '2026-10-28T10:00:00.000Z');
INSERT OR IGNORE INTO status_events (id, submission_id, status, note, created_at) VALUES
('seed-ev-1', 'seed-sub-1', 'prepping', 'Submission created. Cards entered and packed.', '2026-09-18T10:00:00.000Z'),
('seed-ev-2', 'seed-sub-1', 'shipped', 'Shipped via UPS 1Z88410231WQ', '2026-09-18T14:00:00.000Z'),
('seed-ev-3', 'seed-sub-1', 'received', 'Delivered and checked in at PSA.', '2026-09-24T10:00:00.000Z'),
('seed-ev-4', 'seed-sub-1', 'grading', 'Order moved into Grading stage.', '2026-10-20T10:00:00.000Z'),
('seed-ev-5', 'seed-sub-2', 'prepping', 'Submission created.', '2026-08-02T10:00:00.000Z'),
('seed-ev-6', 'seed-sub-2', 'returned', 'Slabs received. Grades popped: Bradshaw 6, Staubach 7.', '2026-08-28T10:00:00.000Z'),
('seed-ev-7', 'seed-sub-3', 'prepping', 'Started prepping TCG bulk order.', '2026-10-28T10:00:00.000Z');
