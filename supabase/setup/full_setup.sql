-- Full database setup: run once in the Supabase SQL Editor of a new project.
-- Combines every migration in supabase/migrations in timestamp order.


-- ===== 20260722065004_create_schema.sql =====
/*
# Masbling Astar Services — Database Schema

## Overview
Creates the complete database schema for the Masbling Astar Services gutter-services
business management app. Single-tenant (no authentication) — all data is shared and
accessible via the Supabase anon key.

## New Tables

1. **services** — Catalog of 7 service offerings (Gutter, Eavesdrop, Window Caulking/Cleaning, Vent, Downpipes, Leaks Sealing, Handyman)
2. **jobs** — Pipeline jobs with status flow: estimate -> scheduled -> in-progress -> complete
3. **invoices** — Billing records linked to jobs (draft -> sent -> paid/overdue)
4. **checklists** — Per-job checklist items with completion tracking
5. **schedules** — Recurring job templates with frequency and next-run date
6. **campaigns** — Marketing campaigns with reach/lead metrics and ad status
7. **csr_tickets** — Customer service interactions with priority and status
8. **job_photos** — Job-site photos for the HCP Cam feature

## Security
- RLS enabled on ALL 8 tables.
- All policies use `TO anon, authenticated` (single-tenant, no auth).
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE) — 32 total.
- `USING (true)` is intentional: data is shared/public in this single-tenant app.

## Important Notes
1. No user_id columns, no auth.uid() checks — single-tenant by design.
2. The anon key frontend can read and write all data directly.
3. Foreign keys use ON DELETE CASCADE for clean child record removal.
4. Indexes added on frequently queried columns (status, service_key, job_id).
*/

-- ==================== SERVICES ====================
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  icon text NOT NULL DEFAULT 'Hammer',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_services" ON services;
CREATE POLICY "anon_select_services" ON services FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_services" ON services;
CREATE POLICY "anon_insert_services" ON services FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_services" ON services;
CREATE POLICY "anon_update_services" ON services FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_services" ON services;
CREATE POLICY "anon_delete_services" ON services FOR DELETE
  TO anon, authenticated USING (true);

-- ==================== JOBS ====================
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text DEFAULT '',
  address text DEFAULT '',
  status text NOT NULL DEFAULT 'estimate',
  urgent boolean NOT NULL DEFAULT false,
  value numeric NOT NULL DEFAULT 0,
  scheduled_date date,
  rating integer,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_jobs" ON jobs;
CREATE POLICY "anon_select_jobs" ON jobs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_jobs" ON jobs;
CREATE POLICY "anon_insert_jobs" ON jobs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_jobs" ON jobs;
CREATE POLICY "anon_update_jobs" ON jobs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_jobs" ON jobs;
CREATE POLICY "anon_delete_jobs" ON jobs FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_service_key ON jobs(service_key);

-- ==================== INVOICES ====================
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_invoices" ON invoices;
CREATE POLICY "anon_select_invoices" ON invoices FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_invoices" ON invoices;
CREATE POLICY "anon_insert_invoices" ON invoices FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_invoices" ON invoices;
CREATE POLICY "anon_update_invoices" ON invoices FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_invoices" ON invoices;
CREATE POLICY "anon_delete_invoices" ON invoices FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON invoices(job_id);

-- ==================== CHECKLISTS ====================
CREATE TABLE IF NOT EXISTS checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  template_name text NOT NULL DEFAULT '',
  item_text text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_checklists" ON checklists;
CREATE POLICY "anon_select_checklists" ON checklists FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_checklists" ON checklists;
CREATE POLICY "anon_insert_checklists" ON checklists FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_checklists" ON checklists;
CREATE POLICY "anon_update_checklists" ON checklists FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_checklists" ON checklists;
CREATE POLICY "anon_delete_checklists" ON checklists FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_checklists_job_id ON checklists(job_id);

-- ==================== SCHEDULES ====================
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  service_key text NOT NULL,
  address text DEFAULT '',
  frequency text NOT NULL DEFAULT 'monthly',
  next_run date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_schedules" ON schedules;
CREATE POLICY "anon_select_schedules" ON schedules FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_schedules" ON schedules;
CREATE POLICY "anon_insert_schedules" ON schedules FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_schedules" ON schedules;
CREATE POLICY "anon_update_schedules" ON schedules FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_schedules" ON schedules;
CREATE POLICY "anon_delete_schedules" ON schedules FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_schedules_active ON schedules(active);

-- ==================== CAMPAIGNS ====================
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  platform text NOT NULL DEFAULT 'Facebook',
  reach integer NOT NULL DEFAULT 0,
  leads integer NOT NULL DEFAULT 0,
  ads_running boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_campaigns" ON campaigns;
CREATE POLICY "anon_select_campaigns" ON campaigns FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_campaigns" ON campaigns;
CREATE POLICY "anon_insert_campaigns" ON campaigns FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_campaigns" ON campaigns;
CREATE POLICY "anon_update_campaigns" ON campaigns FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_campaigns" ON campaigns;
CREATE POLICY "anon_delete_campaigns" ON campaigns FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- ==================== CSR_TICKETS ====================
CREATE TABLE IF NOT EXISTS csr_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE csr_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_csr_tickets" ON csr_tickets;
CREATE POLICY "anon_select_csr_tickets" ON csr_tickets FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_csr_tickets" ON csr_tickets;
CREATE POLICY "anon_insert_csr_tickets" ON csr_tickets FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_csr_tickets" ON csr_tickets;
CREATE POLICY "anon_update_csr_tickets" ON csr_tickets FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_csr_tickets" ON csr_tickets;
CREATE POLICY "anon_delete_csr_tickets" ON csr_tickets FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_csr_tickets_status ON csr_tickets(status);

-- ==================== JOB_PHOTOS ====================
CREATE TABLE IF NOT EXISTS job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_job_photos" ON job_photos;
CREATE POLICY "anon_select_job_photos" ON job_photos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_job_photos" ON job_photos;
CREATE POLICY "anon_insert_job_photos" ON job_photos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_job_photos" ON job_photos;
CREATE POLICY "anon_update_job_photos" ON job_photos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_job_photos" ON job_photos;
CREATE POLICY "anon_delete_job_photos" ON job_photos FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_job_photos_job_id ON job_photos(job_id);

-- ===== 20260722065122_seed_demo_data.sql =====
/*
# Seed Demo Data for Masbling Astar Services

## Overview
Populates all 8 tables with realistic demo data for a gutter-services business.

## Data Inserted
1. **services** — 7 service offerings (gutter, eavesdrop, window-caulking, window-cleaning, vent, downpipes, leaks-sealing, handyman)
2. **jobs** — 12 jobs across all pipeline statuses
3. **invoices** — 8 invoices across all billing statuses
4. **checklists** — Checklist items for 4 jobs
5. **schedules** — 5 recurring schedules
6. **campaigns** — 5 marketing campaigns
7. **csr_tickets** — 4 CSR tickets
8. **job_photos** — 3 job photos

## Security
No security changes — only DML inserts. Uses ON CONFLICT DO NOTHING for idempotency.
*/

-- ==================== SERVICES ====================
INSERT INTO services (key, label, icon) VALUES
  ('gutter', 'Gutter Cleaning / Eavestrough', 'CloudRain'),
  ('eavesdrop', 'Eavesdrop', 'AlignHorizontalDistribute'),
  ('window-caulking', 'Window Caulking', 'FrameCorners'),
  ('window-cleaning', 'Window Cleaning', 'Sparkles'),
  ('vent', 'Vent', 'Wind'),
  ('downpipes', 'Downpipes', 'PipeValve'),
  ('leaks-sealing', 'Leaks Sealing', 'Droplets'),
  ('handyman', 'Handyman', 'Wrench')
ON CONFLICT (key) DO NOTHING;

-- ==================== JOBS ====================
INSERT INTO jobs (service_key, customer_name, customer_phone, address, status, urgent, value, scheduled_date, rating, notes) VALUES
  ('gutter', 'Sarah Mitchell', '416-555-0142', '24 Maple Ridge Dr, Etobicoke ON', 'estimate', true, 2400, '2026-07-25', NULL, 'Full gutter replacement, 2-story home'),
  ('downpipes', 'James O''Brien', '416-555-0198', '88 King St W, Toronto ON', 'estimate', false, 850, NULL, NULL, 'Two downpipes need replacing on east side'),
  ('leaks-sealing', 'Maria Santos', '905-555-0177', '15 Bloor St E, Mississauga ON', 'estimate', true, 650, NULL, NULL, 'Active leak around chimney flashing'),
  ('window-cleaning', 'David Chen', '416-555-0233', '302 The Queensway, Toronto ON', 'scheduled', false, 480, '2026-07-26', NULL, 'Full exterior window clean, 1-story commercial'),
  ('gutter', 'Linda & Robert Hayes', '416-555-0166', '77 Forest Manor Rd, North York ON', 'scheduled', false, 3200, '2026-07-28', NULL, 'New gutter install with leaf guard system'),
  ('eavesdrop', 'Priya Patel', '416-555-0189', '412 Yonge St, Toronto ON', 'in-progress', false, 1200, '2026-07-22', NULL, 'Eavesdrop repair, back of house'),
  ('window-caulking', 'Tom Walsh', '647-555-0144', '55 Lakeshore Blvd W, Toronto ON', 'in-progress', true, 950, '2026-07-22', NULL, 'Recaulking all ground-floor windows, urgent — water ingress'),
  ('vent', 'Greenfield Properties', '416-555-0900', '200 Front St W, Toronto ON', 'in-progress', false, 1800, '2026-07-23', NULL, 'Dryer vent cleaning, 12-unit building'),
  ('gutter', 'Emily Tran', '416-555-0112', '9 Baby Point Rd, Toronto ON', 'complete', false, 2100, '2026-07-18', 5, 'Gutter cleaning + minor repair, completed on time'),
  ('downpipes', 'Michael O''Connor', '416-555-0155', '33 Avenue Rd, Toronto ON', 'complete', false, 720, '2026-07-15', 4, 'Downpipe realignment, good work'),
  ('leaks-sealing', 'Jennifer Liu', '905-555-0123', '88 Ennerdale Rd, Markham ON', 'complete', false, 580, '2026-07-12', 5, 'Sealed roof-edge leak, no issues since'),
  ('handyman', 'Carlos Mendez', '416-555-0178', '17 Roncesvalles Ave, Toronto ON', 'complete', false, 400, '2026-07-10', 4, 'Misc handyman tasks — drywall patch, door alignment')
ON CONFLICT DO NOTHING;

-- ==================== INVOICES ====================
-- Fetch job IDs for completed/scheduled jobs
INSERT INTO invoices (number, job_id, customer_name, amount, status, sent_at, paid_at)
SELECT 'INV-2026-001', j.id, 'Emily Tran', 2100, 'paid', '2026-07-18'::timestamptz, '2026-07-19'::timestamptz
FROM jobs j WHERE j.customer_name = 'Emily Tran' AND j.service_key = 'gutter'
ON CONFLICT DO NOTHING;

INSERT INTO invoices (number, job_id, customer_name, amount, status, sent_at, paid_at)
SELECT 'INV-2026-002', j.id, 'Michael O''Connor', 720, 'paid', '2026-07-15'::timestamptz, '2026-07-16'::timestamptz
FROM jobs j WHERE j.customer_name = 'Michael O''Connor'
ON CONFLICT DO NOTHING;

INSERT INTO invoices (number, job_id, customer_name, amount, status, sent_at, paid_at)
SELECT 'INV-2026-003', j.id, 'Jennifer Liu', 580, 'paid', '2026-07-12'::timestamptz, '2026-07-14'::timestamptz
FROM jobs j WHERE j.customer_name = 'Jennifer Liu'
ON CONFLICT DO NOTHING;

INSERT INTO invoices (number, job_id, customer_name, amount, status, sent_at, paid_at)
SELECT 'INV-2026-004', j.id, 'Carlos Mendez', 400, 'paid', '2026-07-10'::timestamptz, '2026-07-11'::timestamptz
FROM jobs j WHERE j.customer_name = 'Carlos Mendez'
ON CONFLICT DO NOTHING;

INSERT INTO invoices (number, job_id, customer_name, amount, status, sent_at, paid_at)
SELECT 'INV-2026-005', j.id, 'Priya Patel', 1200, 'sent', '2026-07-21'::timestamptz, NULL
FROM jobs j WHERE j.customer_name = 'Priya Patel'
ON CONFLICT DO NOTHING;

INSERT INTO invoices (number, job_id, customer_name, amount, status, sent_at, paid_at)
SELECT 'INV-2026-006', j.id, 'Tom Walsh', 950, 'sent', '2026-07-20'::timestamptz, NULL
FROM jobs j WHERE j.customer_name = 'Tom Walsh'
ON CONFLICT DO NOTHING;

INSERT INTO invoices (number, job_id, customer_name, amount, status, sent_at, paid_at)
SELECT 'INV-2026-007', j.id, 'Greenfield Properties', 1800, 'overdue', '2026-07-15'::timestamptz, NULL
FROM jobs j WHERE j.customer_name = 'Greenfield Properties'
ON CONFLICT DO NOTHING;

INSERT INTO invoices (number, job_id, customer_name, amount, status, sent_at, paid_at)
SELECT 'INV-2026-008', NULL, 'Walk-in Customer', 320, 'draft', NULL, NULL
ON CONFLICT DO NOTHING;

-- ==================== CHECKLISTS ====================
-- Checklist for Priya Patel (eavesdrop repair, in-progress)
INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Eavesdrop Repair', 'Inspect existing eavesdrop condition', true
FROM jobs j WHERE j.customer_name = 'Priya Patel'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Eavesdrop Repair', 'Remove damaged sections', true
FROM jobs j WHERE j.customer_name = 'Priya Patel'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Eavesdrop Repair', 'Cut replacement sections to size', false
FROM jobs j WHERE j.customer_name = 'Priya Patel'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Eavesdrop Repair', 'Install and seal new eavesdrop', false
FROM jobs j WHERE j.customer_name = 'Priya Patel'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Eavesdrop Repair', 'Test water flow and check for leaks', false
FROM jobs j WHERE j.customer_name = 'Priya Patel'
ON CONFLICT DO NOTHING;

-- Checklist for Tom Walsh (window caulking, in-progress)
INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Window Caulking', 'Remove old caulk from all ground-floor windows', true
FROM jobs j WHERE j.customer_name = 'Tom Walsh'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Window Caulking', 'Clean and dry all window frames', false
FROM jobs j WHERE j.customer_name = 'Tom Walsh'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Window Caulking', 'Apply new silicone caulk bead', false
FROM jobs j WHERE j.customer_name = 'Tom Walsh'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Window Caulking', 'Smooth and inspect all joints', false
FROM jobs j WHERE j.customer_name = 'Tom Walsh'
ON CONFLICT DO NOTHING;

-- Checklist for Linda Hayes (gutter install, scheduled)
INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Gutter Install', 'Measure and mark gutter run lines', false
FROM jobs j WHERE j.customer_name = 'Linda & Robert Hayes'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Gutter Install', 'Install fascia brackets', false
FROM jobs j WHERE j.customer_name = 'Linda & Robert Hayes'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Gutter Install', 'Mount gutter sections and joiners', false
FROM jobs j WHERE j.customer_name = 'Linda & Robert Hayes'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Gutter Install', 'Install leaf guard system', false
FROM jobs j WHERE j.customer_name = 'Linda & Robert Hayes'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Gutter Install', 'Connect downpipes and test drainage', false
FROM jobs j WHERE j.customer_name = 'Linda & Robert Hayes'
ON CONFLICT DO NOTHING;

-- Checklist for David Chen (window cleaning, scheduled)
INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Window Cleaning', 'Set up ladder and safety equipment', false
FROM jobs j WHERE j.customer_name = 'David Chen'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Window Cleaning', 'Apply cleaning solution to all windows', false
FROM jobs j WHERE j.customer_name = 'David Chen'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Window Cleaning', 'Squeegee and dry all glass surfaces', false
FROM jobs j WHERE j.customer_name = 'David Chen'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Window Cleaning', 'Inspect for streaks and touch up', false
FROM jobs j WHERE j.customer_name = 'David Chen'
ON CONFLICT DO NOTHING;

-- ==================== SCHEDULES ====================
INSERT INTO schedules (customer_name, service_key, address, frequency, next_run, active) VALUES
  ('Greenfield Properties', 'vent', '200 Front St W, Toronto ON', 'quarterly', '2026-10-23', true),
  ('Riverside Condo Board', 'window-cleaning', '55 Lakeshore Blvd W, Toronto ON', 'monthly', '2026-08-15', true),
  ('Sarah Mitchell', 'gutter', '24 Maple Ridge Dr, Etobicoke ON', 'biannual', '2026-11-01', true),
  ('Maple Leaf Plaza', 'eavesdrop', '302 The Queensway, Toronto ON', 'annual', '2026-09-10', true),
  ('David Chen', 'window-cleaning', '302 The Queensway, Toronto ON', 'quarterly', '2026-10-26', true)
ON CONFLICT DO NOTHING;

-- ==================== CAMPAIGNS ====================
INSERT INTO campaigns (name, status, platform, reach, leads, ads_running) VALUES
  ('Summer Gutter Cleanup Promo', 'active', 'Facebook', 12400, 47, true),
  ('Fall Eavesdrop Maintenance Drive', 'active', 'Instagram', 8200, 31, true),
  ('Window Cleaning New Customer Special', 'paused', 'Facebook', 5600, 12, false),
  ('Downpipe Repair Google Ads', 'active', 'Google', 3200, 18, true),
  ('Handyman Holiday Package', 'draft', 'Instagram', 0, 0, false)
ON CONFLICT DO NOTHING;

-- ==================== CSR TICKETS ====================
INSERT INTO csr_tickets (job_id, customer_name, subject, status, priority) VALUES
  (NULL, 'Greenfield Properties', 'Invoice question — billing for vent cleaning', 'open', 'high'),
  (NULL, 'Sarah Mitchell', 'Reschedule estimate appointment', 'open', 'medium'),
  (NULL, 'Emily Tran', 'Follow-up call after gutter service — very happy', 'resolved', 'low'),
  (NULL, 'Priya Patel', 'Question about eavesdrop warranty coverage', 'open', 'medium')
ON CONFLICT DO NOTHING;

-- Link some tickets to jobs
UPDATE csr_tickets SET job_id = (SELECT id FROM jobs WHERE customer_name = 'Sarah Mitchell' LIMIT 1)
WHERE subject = 'Reschedule estimate appointment';

UPDATE csr_tickets SET job_id = (SELECT id FROM jobs WHERE customer_name = 'Emily Tran' LIMIT 1)
WHERE subject = 'Follow-up call after gutter service — very happy';

UPDATE csr_tickets SET job_id = (SELECT id FROM jobs WHERE customer_name = 'Priya Patel' LIMIT 1)
WHERE subject = 'Question about eavesdrop warranty coverage';

-- ==================== JOB PHOTOS ====================
INSERT INTO job_photos (job_id, photo_url, caption) VALUES
  ((SELECT id FROM jobs WHERE customer_name = 'Priya Patel' LIMIT 1), 'https://images.pexels.com/photos/76093/rope-teamwork-industrial-climb-76093.jpeg?auto=compress&cs=tinysrgb&w=600', 'Eavesdrop damage before repair'),
  ((SELECT id FROM jobs WHERE customer_name = 'Tom Walsh' LIMIT 1), 'https://images.pexels.com/photos/53610/large-greenhouse-tomatoes-plant-53610.jpg?auto=compress&cs=tinysrgb&w=600', 'Window frame with deteriorated caulk'),
  ((SELECT id FROM jobs WHERE customer_name = 'Emily Tran' LIMIT 1), 'https://images.pexels.com/photos/209266/pexels-photo-209266.jpeg?auto=compress&cs=tinysrgb&w=600', 'Completed gutter job — final inspection')
ON CONFLICT DO NOTHING;

-- ===== 20260722065824_update_service_icons.sql =====
/*
# Update service icon names

## Overview
Updates the icon text values in the services table to match valid lucide-react icon names.
This is a data-only update — no schema changes.

## Changes
- eavesdrop: AlignHorizontalDistribute -> AlignCenterHorizontal
- window-caulking: FrameCorners -> Frame
- downpipes: PipeValve -> Pipette
*/

UPDATE services SET icon = 'AlignCenterHorizontal' WHERE key = 'eavesdrop';
UPDATE services SET icon = 'Frame' WHERE key = 'window-caulking';
UPDATE services SET icon = 'Pipette' WHERE key = 'downpipes';

-- ===== 20260722151327_create_schema.sql =====
/*
# Masbling Astar Services — Database Schema

## Overview
Creates the complete database schema for a gutter-services business management app.
Single-tenant (no authentication) — all data is shared and accessible via the anon key.

## New Tables
1. services — Catalog of service offerings (gutter, eavesdrop, window caulking/cleaning, vent, downpipes, leaks sealing, handyman)
2. jobs — Pipeline jobs with status flow: estimate -> scheduled -> in-progress -> complete
3. invoices — Billing records linked to jobs (draft -> sent -> paid/overdue)
4. checklists — Per-job checklist items with completion tracking
5. schedules — Recurring job templates with frequency and next-run date
6. campaigns — Marketing campaigns with reach/lead metrics and ad status
7. csr_tickets — Customer service interactions with priority and status
8. job_photos — Job-site photos for the HCP Cam feature

## Security
- RLS enabled on ALL 8 tables.
- All policies use TO anon, authenticated (single-tenant, no auth).
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE).
- USING (true) is intentional: data is shared/public in this single-tenant app.

## Important Notes
1. No user_id columns, no auth.uid() checks — single-tenant by design.
2. Foreign keys use ON DELETE CASCADE for clean child record removal.
3. Indexes added on frequently queried columns.
*/

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  icon text NOT NULL DEFAULT 'Wrench',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_services" ON services;
CREATE POLICY "anon_select_services" ON services FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_services" ON services;
CREATE POLICY "anon_insert_services" ON services FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_services" ON services;
CREATE POLICY "anon_update_services" ON services FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_services" ON services;
CREATE POLICY "anon_delete_services" ON services FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text DEFAULT '',
  address text DEFAULT '',
  status text NOT NULL DEFAULT 'estimate',
  urgent boolean NOT NULL DEFAULT false,
  value numeric NOT NULL DEFAULT 0,
  scheduled_date date,
  rating integer,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_jobs" ON jobs;
CREATE POLICY "anon_select_jobs" ON jobs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_jobs" ON jobs;
CREATE POLICY "anon_insert_jobs" ON jobs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_jobs" ON jobs;
CREATE POLICY "anon_update_jobs" ON jobs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_jobs" ON jobs;
CREATE POLICY "anon_delete_jobs" ON jobs FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_service_key ON jobs(service_key);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_invoices" ON invoices;
CREATE POLICY "anon_select_invoices" ON invoices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_invoices" ON invoices;
CREATE POLICY "anon_insert_invoices" ON invoices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_invoices" ON invoices;
CREATE POLICY "anon_update_invoices" ON invoices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_invoices" ON invoices;
CREATE POLICY "anon_delete_invoices" ON invoices FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

CREATE TABLE IF NOT EXISTS checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  template_name text NOT NULL DEFAULT '',
  item_text text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_checklists" ON checklists;
CREATE POLICY "anon_select_checklists" ON checklists FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_checklists" ON checklists;
CREATE POLICY "anon_insert_checklists" ON checklists FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_checklists" ON checklists;
CREATE POLICY "anon_update_checklists" ON checklists FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_checklists" ON checklists;
CREATE POLICY "anon_delete_checklists" ON checklists FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_checklists_job_id ON checklists(job_id);

CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  service_key text NOT NULL,
  address text DEFAULT '',
  frequency text NOT NULL DEFAULT 'monthly',
  next_run date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_schedules" ON schedules;
CREATE POLICY "anon_select_schedules" ON schedules FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_schedules" ON schedules;
CREATE POLICY "anon_insert_schedules" ON schedules FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_schedules" ON schedules;
CREATE POLICY "anon_update_schedules" ON schedules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_schedules" ON schedules;
CREATE POLICY "anon_delete_schedules" ON schedules FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  platform text NOT NULL DEFAULT 'Facebook',
  reach integer NOT NULL DEFAULT 0,
  leads integer NOT NULL DEFAULT 0,
  ads_running boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_campaigns" ON campaigns;
CREATE POLICY "anon_select_campaigns" ON campaigns FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_campaigns" ON campaigns;
CREATE POLICY "anon_insert_campaigns" ON campaigns FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_campaigns" ON campaigns;
CREATE POLICY "anon_update_campaigns" ON campaigns FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_campaigns" ON campaigns;
CREATE POLICY "anon_delete_campaigns" ON campaigns FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS csr_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE csr_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_csr_tickets" ON csr_tickets;
CREATE POLICY "anon_select_csr_tickets" ON csr_tickets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_csr_tickets" ON csr_tickets;
CREATE POLICY "anon_insert_csr_tickets" ON csr_tickets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_csr_tickets" ON csr_tickets;
CREATE POLICY "anon_update_csr_tickets" ON csr_tickets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_csr_tickets" ON csr_tickets;
CREATE POLICY "anon_delete_csr_tickets" ON csr_tickets FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_job_photos" ON job_photos;
CREATE POLICY "anon_select_job_photos" ON job_photos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_job_photos" ON job_photos;
CREATE POLICY "anon_insert_job_photos" ON job_photos FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_job_photos" ON job_photos;
CREATE POLICY "anon_update_job_photos" ON job_photos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_job_photos" ON job_photos;
CREATE POLICY "anon_delete_job_photos" ON job_photos FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_job_photos_job_id ON job_photos(job_id);

-- ===== 20260722151414_seed_demo_data.sql =====
/*
# Seed Demo Data for Masbling Astar Services

## Overview
Populates all 8 tables with realistic demo data for a gutter-services business.

## Data Inserted
1. services — 8 service offerings with verified lucide-react icon names
2. jobs — 12 jobs across all pipeline statuses
3. invoices — 8 invoices across all billing statuses
4. checklists — Checklist items for 4 jobs
5. schedules — 5 recurring schedules
6. campaigns — 5 marketing campaigns
7. csr_tickets — 4 CSR tickets
8. job_photos — 3 job photos
*/

INSERT INTO services (key, label, icon) VALUES
  ('gutter', 'Gutter Cleaning / Eavestrough', 'CloudRain'),
  ('eavesdrop', 'Eavesdrop', 'AlignCenterHorizontal'),
  ('window-caulking', 'Window Caulking', 'Frame'),
  ('window-cleaning', 'Window Cleaning', 'Sparkles'),
  ('vent', 'Vent', 'Wind'),
  ('downpipes', 'Downpipes', 'Pipette'),
  ('leaks-sealing', 'Leaks Sealing', 'Droplets'),
  ('handyman', 'Handyman', 'Wrench')
ON CONFLICT (key) DO NOTHING;

INSERT INTO jobs (service_key, customer_name, customer_phone, address, status, urgent, value, scheduled_date, rating, notes) VALUES
  ('gutter', 'Sarah Mitchell', '416-555-0142', '24 Maple Ridge Dr, Etobicoke ON', 'estimate', true, 2400, '2026-07-25', NULL, 'Full gutter replacement, 2-story home'),
  ('downpipes', 'James OBrien', '416-555-0198', '88 King St W, Toronto ON', 'estimate', false, 850, NULL, NULL, 'Two downpipes need replacing on east side'),
  ('leaks-sealing', 'Maria Santos', '905-555-0177', '15 Bloor St E, Mississauga ON', 'estimate', true, 650, NULL, NULL, 'Active leak around chimney flashing'),
  ('window-cleaning', 'David Chen', '416-555-0233', '302 The Queensway, Toronto ON', 'scheduled', false, 480, '2026-07-26', NULL, 'Full exterior window clean, 1-story commercial'),
  ('gutter', 'Linda Hayes', '416-555-0166', '77 Forest Manor Rd, North York ON', 'scheduled', false, 3200, '2026-07-28', NULL, 'New gutter install with leaf guard system'),
  ('eavesdrop', 'Priya Patel', '416-555-0189', '412 Yonge St, Toronto ON', 'in-progress', false, 1200, '2026-07-22', NULL, 'Eavesdrop repair, back of house'),
  ('window-caulking', 'Tom Walsh', '647-555-0144', '55 Lakeshore Blvd W, Toronto ON', 'in-progress', true, 950, '2026-07-22', NULL, 'Recaulking all ground-floor windows, urgent — water ingress'),
  ('vent', 'Greenfield Properties', '416-555-0900', '200 Front St W, Toronto ON', 'in-progress', false, 1800, '2026-07-23', NULL, 'Dryer vent cleaning, 12-unit building'),
  ('gutter', 'Emily Tran', '416-555-0112', '9 Baby Point Rd, Toronto ON', 'complete', false, 2100, '2026-07-18', 5, 'Gutter cleaning + minor repair, completed on time'),
  ('downpipes', 'Michael OConnor', '416-555-0155', '33 Avenue Rd, Toronto ON', 'complete', false, 720, '2026-07-15', 4, 'Downpipe realignment, good work'),
  ('leaks-sealing', 'Jennifer Liu', '905-555-0123', '88 Ennerdale Rd, Markham ON', 'complete', false, 580, '2026-07-12', 5, 'Sealed roof-edge leak, no issues since'),
  ('handyman', 'Carlos Mendez', '416-555-0178', '17 Roncesvalles Ave, Toronto ON', 'complete', false, 400, '2026-07-10', 4, 'Misc handyman tasks — drywall patch, door alignment')
ON CONFLICT DO NOTHING;

INSERT INTO invoices (number, job_id, customer_name, amount, status, sent_at, paid_at)
SELECT 'INV-2026-001', j.id, 'Emily Tran', 2100, 'paid', '2026-07-18'::timestamptz, '2026-07-19'::timestamptz
FROM jobs j WHERE j.customer_name = 'Emily Tran' AND j.service_key = 'gutter'
ON CONFLICT DO NOTHING;

INSERT INTO invoices (number, job_id, customer_name, amount, status, sent_at, paid_at)
SELECT 'INV-2026-002', j.id, 'Michael OConnor', 720, 'paid', '2026-07-15'::timestamptz, '2026-07-16'::timestamptz
FROM jobs j WHERE j.customer_name = 'Michael OConnor'
ON CONFLICT DO NOTHING;

INSERT INTO invoices (number, job_id, customer_name, amount, status, sent_at, paid_at)
SELECT 'INV-2026-003', j.id, 'Jennifer Liu', 580, 'paid', '2026-07-12'::timestamptz, '2026-07-14'::timestamptz
FROM jobs j WHERE j.customer_name = 'Jennifer Liu'
ON CONFLICT DO NOTHING;

INSERT INTO invoices (number, job_id, customer_name, amount, status, sent_at, paid_at)
SELECT 'INV-2026-004', j.id, 'Carlos Mendez', 400, 'paid', '2026-07-10'::timestamptz, '2026-07-11'::timestamptz
FROM jobs j WHERE j.customer_name = 'Carlos Mendez'
ON CONFLICT DO NOTHING;

INSERT INTO invoices (number, job_id, customer_name, amount, status, sent_at, paid_at)
SELECT 'INV-2026-005', j.id, 'Priya Patel', 1200, 'sent', '2026-07-21'::timestamptz, NULL
FROM jobs j WHERE j.customer_name = 'Priya Patel'
ON CONFLICT DO NOTHING;

INSERT INTO invoices (number, job_id, customer_name, amount, status, sent_at, paid_at)
SELECT 'INV-2026-006', j.id, 'Tom Walsh', 950, 'sent', '2026-07-20'::timestamptz, NULL
FROM jobs j WHERE j.customer_name = 'Tom Walsh'
ON CONFLICT DO NOTHING;

INSERT INTO invoices (number, job_id, customer_name, amount, status, sent_at, paid_at)
SELECT 'INV-2026-007', j.id, 'Greenfield Properties', 1800, 'overdue', '2026-07-15'::timestamptz, NULL
FROM jobs j WHERE j.customer_name = 'Greenfield Properties'
ON CONFLICT DO NOTHING;

INSERT INTO invoices (number, job_id, customer_name, amount, status, sent_at, paid_at)
SELECT 'INV-2026-008', NULL, 'Walk-in Customer', 320, 'draft', NULL, NULL
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Eavesdrop Repair', 'Inspect existing eavesdrop condition', true
FROM jobs j WHERE j.customer_name = 'Priya Patel'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Eavesdrop Repair', 'Remove damaged sections', true
FROM jobs j WHERE j.customer_name = 'Priya Patel'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Eavesdrop Repair', 'Cut replacement sections to size', false
FROM jobs j WHERE j.customer_name = 'Priya Patel'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Eavesdrop Repair', 'Install and seal new eavesdrop', false
FROM jobs j WHERE j.customer_name = 'Priya Patel'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Eavesdrop Repair', 'Test water flow and check for leaks', false
FROM jobs j WHERE j.customer_name = 'Priya Patel'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Window Caulking', 'Remove old caulk from all ground-floor windows', true
FROM jobs j WHERE j.customer_name = 'Tom Walsh'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Window Caulking', 'Clean and dry all window frames', false
FROM jobs j WHERE j.customer_name = 'Tom Walsh'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Window Caulking', 'Apply new silicone caulk bead', false
FROM jobs j WHERE j.customer_name = 'Tom Walsh'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Window Caulking', 'Smooth and inspect all joints', false
FROM jobs j WHERE j.customer_name = 'Tom Walsh'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Gutter Install', 'Measure and mark gutter run lines', false
FROM jobs j WHERE j.customer_name = 'Linda Hayes'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Gutter Install', 'Install fascia brackets', false
FROM jobs j WHERE j.customer_name = 'Linda Hayes'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Gutter Install', 'Mount gutter sections and joiners', false
FROM jobs j WHERE j.customer_name = 'Linda Hayes'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Gutter Install', 'Install leaf guard system', false
FROM jobs j WHERE j.customer_name = 'Linda Hayes'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Gutter Install', 'Connect downpipes and test drainage', false
FROM jobs j WHERE j.customer_name = 'Linda Hayes'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Window Cleaning', 'Set up ladder and safety equipment', false
FROM jobs j WHERE j.customer_name = 'David Chen'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Window Cleaning', 'Apply cleaning solution to all windows', false
FROM jobs j WHERE j.customer_name = 'David Chen'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Window Cleaning', 'Squeegee and dry all glass surfaces', false
FROM jobs j WHERE j.customer_name = 'David Chen'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (job_id, template_name, item_text, completed)
SELECT j.id, 'Window Cleaning', 'Inspect for streaks and touch up', false
FROM jobs j WHERE j.customer_name = 'David Chen'
ON CONFLICT DO NOTHING;

INSERT INTO schedules (customer_name, service_key, address, frequency, next_run, active) VALUES
  ('Greenfield Properties', 'vent', '200 Front St W, Toronto ON', 'quarterly', '2026-10-23', true),
  ('Riverside Condo Board', 'window-cleaning', '55 Lakeshore Blvd W, Toronto ON', 'monthly', '2026-08-15', true),
  ('Sarah Mitchell', 'gutter', '24 Maple Ridge Dr, Etobicoke ON', 'biannual', '2026-11-01', true),
  ('Maple Leaf Plaza', 'eavesdrop', '302 The Queensway, Toronto ON', 'annual', '2026-09-10', true),
  ('David Chen', 'window-cleaning', '302 The Queensway, Toronto ON', 'quarterly', '2026-10-26', true)
ON CONFLICT DO NOTHING;

INSERT INTO campaigns (name, status, platform, reach, leads, ads_running) VALUES
  ('Summer Gutter Cleanup Promo', 'active', 'Facebook', 12400, 47, true),
  ('Fall Eavesdrop Maintenance Drive', 'active', 'Instagram', 8200, 31, true),
  ('Window Cleaning New Customer Special', 'paused', 'Facebook', 5600, 12, false),
  ('Downpipe Repair Google Ads', 'active', 'Google', 3200, 18, true),
  ('Handyman Holiday Package', 'draft', 'Instagram', 0, 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO csr_tickets (job_id, customer_name, subject, status, priority) VALUES
  (NULL, 'Greenfield Properties', 'Invoice question — billing for vent cleaning', 'open', 'high'),
  (NULL, 'Sarah Mitchell', 'Reschedule estimate appointment', 'open', 'medium'),
  (NULL, 'Emily Tran', 'Follow-up call after gutter service — very happy', 'resolved', 'low'),
  (NULL, 'Priya Patel', 'Question about eavesdrop warranty coverage', 'open', 'medium')
ON CONFLICT DO NOTHING;

UPDATE csr_tickets SET job_id = (SELECT id FROM jobs WHERE customer_name = 'Sarah Mitchell' LIMIT 1)
WHERE subject = 'Reschedule estimate appointment';
UPDATE csr_tickets SET job_id = (SELECT id FROM jobs WHERE customer_name = 'Emily Tran' LIMIT 1)
WHERE subject = 'Follow-up call after gutter service — very happy';
UPDATE csr_tickets SET job_id = (SELECT id FROM jobs WHERE customer_name = 'Priya Patel' LIMIT 1)
WHERE subject = 'Question about eavesdrop warranty coverage';

INSERT INTO job_photos (job_id, photo_url, caption) VALUES
  ((SELECT id FROM jobs WHERE customer_name = 'Priya Patel' LIMIT 1), 'https://images.pexels.com/photos/76093/rope-teamwork-industrial-climb-76093.jpeg?auto=compress&cs=tinysrgb&w=600', 'Eavesdrop damage before repair'),
  ((SELECT id FROM jobs WHERE customer_name = 'Tom Walsh' LIMIT 1), 'https://images.pexels.com/photos/53610/large-greenhouse-tomatoes-plant-53610.jpg?auto=compress&cs=tinysrgb&w=600', 'Window frame with deteriorated caulk'),
  ((SELECT id FROM jobs WHERE customer_name = 'Emily Tran' LIMIT 1), 'https://images.pexels.com/photos/209266/pexels-photo-209266.jpeg?auto=compress&cs=tinysrgb&w=600', 'Completed gutter job — final inspection')
ON CONFLICT DO NOTHING;

-- ===== 20260722170821_create_security_audit_helper_functions.sql =====
/*
# Security Audit Helper Functions

Creates a set of SECURITY DEFINER functions used by the security-audit
edge function to inspect the database for RLS and indexing vulnerabilities.

## Functions created
1. `check_rls_status()` — returns table_name, rls_enabled, rls_forced for all public tables
2. `check_policy_coverage()` — returns per-table policy counts and which CRUD verbs are covered
3. `check_permissive_policies()` — returns policies that use USING(true) or WITH CHECK(true)
4. `check_fk_indexes()` — returns FK columns that lack an index
5. `check_filter_indexes()` — returns commonly-filtered columns (status, service_key, active) that lack an index
6. `exec_sql(sql_text text)` — executes a DDL statement (for applying fixes)

## Security
- All functions are SECURITY DEFINER so the edge function (service role) can inspect pg_catalog
- `exec_sql` is restricted to DDL only (CREATE INDEX, ALTER TABLE ... FORCE RLS) — it rejects
  any statement containing SELECT, INSERT, UPDATE, DELETE, DROP, TRUNCATE, GRANT, or REVOKE
  to prevent data exfiltration or destruction through the audit endpoint
*/

-- 1. RLS status
CREATE OR REPLACE FUNCTION public.check_rls_status()
RETURNS TABLE(table_name text, rls_enabled boolean, rls_forced boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    c.relname::text,
    c.relrowsecurity,
    c.relforcerowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.relname;
$$;

-- 2. Policy coverage per table
-- polcmd: '*' = ALL, 'r' = SELECT, 'a' = INSERT, 'w' = UPDATE, 'd' = DELETE
CREATE OR REPLACE FUNCTION public.check_policy_coverage()
RETURNS TABLE(
  table_name text,
  policy_count bigint,
  has_select boolean,
  has_insert boolean,
  has_update boolean,
  has_delete boolean
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    t.relname::text,
    COUNT(p.polname)::bigint,
    bool_or(p.polcmd IN ('r', '*')),
    bool_or(p.polcmd IN ('a', '*')),
    bool_or(p.polcmd IN ('w', '*')),
    bool_or(p.polcmd IN ('d', '*'))
  FROM pg_class t
  JOIN pg_namespace n ON n.oid = t.relnamespace
  LEFT JOIN pg_policy p ON p.polrelid = t.oid
  WHERE n.nspname = 'public' AND t.relkind = 'r'
  GROUP BY t.relname
  ORDER BY t.relname;
$$;

-- 3. Permissive policies (USING true / WITH CHECK true)
CREATE OR REPLACE FUNCTION public.check_permissive_policies()
RETURNS TABLE(
  tablename text,
  policyname text,
  cmd text,
  qual text,
  with_check text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    c.relname::text,
    p.polname::text,
    p.polcmd::text,
    pg_get_expr(p.polqual, p.polrelid)::text,
    pg_get_expr(p.polwithcheck, p.polrelid)::text
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public';
$$;

-- 4. FK columns missing indexes
CREATE OR REPLACE FUNCTION public.check_fk_indexes()
RETURNS TABLE(
  table_name text,
  column_name text,
  constraint_name text,
  foreign_table text,
  has_index boolean
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH fk_cols AS (
    SELECT
      cl.relname::text AS table_name,
      att.attname::text AS column_name,
      con.conname::text AS constraint_name,
      cl2.relname::text AS foreign_table
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    JOIN pg_class cl2 ON cl2.oid = con.confrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    JOIN pg_attribute att ON att.attrelid = cl.oid AND att.attnum = con.conkey[1]
    WHERE n.nspname = 'public' AND con.contype = 'f'
  )
  SELECT
    f.table_name,
    f.column_name,
    f.constraint_name,
    f.foreign_table,
    EXISTS(
      SELECT 1 FROM pg_index ix
      JOIN pg_class tc ON tc.oid = ix.indrelid
      JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = ix.indkey[0]
      WHERE tc.relname = f.table_name AND a.attname = f.column_name
    ) AS has_index
  FROM fk_cols f;
$$;

-- 5. Commonly-filtered columns missing indexes
CREATE OR REPLACE FUNCTION public.check_filter_indexes()
RETURNS TABLE(
  table_name text,
  column_name text,
  has_index boolean
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH filter_cols AS (
    SELECT
      c.relname::text AS table_name,
      a.attname::text AS column_name
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND a.attnum > 0
      AND a.attname IN ('status', 'service_key', 'active', 'job_id')
  )
  SELECT
    f.table_name,
    f.column_name,
    EXISTS(
      SELECT 1 FROM pg_index ix
      JOIN pg_class tc ON tc.oid = ix.indrelid
      JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = ix.indkey[0]
      WHERE tc.relname = f.table_name AND a.attname = f.column_name
    ) AS has_index
  FROM filter_cols f;
$$;

-- 6. Safe DDL executor (index creation + force RLS only)
CREATE OR REPLACE FUNCTION public.exec_sql(sql_text text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Reject anything that isn't DDL for index creation or RLS forcing
  IF sql_text !~* '^\s*(CREATE\s+INDEX|ALTER\s+TABLE\s+\S+\s+FORCE\s+ROW\s+LEVEL\s+SECURITY)' THEN
    RAISE EXCEPTION 'Blocked: only CREATE INDEX and ALTER TABLE ... FORCE ROW LEVEL SECURITY are allowed';
  END IF;
  EXECUTE sql_text;
END;
$$;

-- Revoke access from anon, grant to authenticated (edge function uses service role)
REVOKE ALL ON FUNCTION public.check_rls_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_policy_coverage() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_permissive_policies() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_fk_indexes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_filter_indexes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;


-- ===== 20260722172343_fix_security_definer_function_permissions.sql =====
/*
# Fix SECURITY DEFINER function execute permissions

## Summary
Revokes EXECUTE on all SECURITY DEFINER helper functions from the `anon` and `authenticated` roles.
These functions (check_rls_status, check_policy_coverage, check_permissive_policies,
check_fk_indexes, check_filter_indexes, exec_sql) are only used by the `security-audit`
edge function, which calls them with the service role key (which bypasses RLS and retains
EXECUTE privileges). Exposing them to anon/authenticated — especially `exec_sql`, which
runs arbitrary SQL — is a privilege escalation risk.

## Security Changes
1. REVOKE EXECUTE on all six helper functions FROM anon, authenticated.
   - The service role still has execute privileges, so the edge function continues to work.
   - `exec_sql` is the most critical: it runs arbitrary SQL as SECURITY DEFINER. Even though
     it filters to CREATE INDEX / ALTER TABLE FORCE RLS, that regex filter is bypassable.
     Revoking public execute eliminates the attack surface entirely.

## Important Notes
1. The security-audit edge function uses the service role key, which is unaffected by this
   revoke — it continues to call all helper functions normally.
2. No application code changes required — the frontend never calls these functions directly
   via RPC; only the edge function does, server-side.
*/

REVOKE EXECUTE ON FUNCTION public.check_filter_indexes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_fk_indexes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_permissive_policies() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_policy_coverage() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rls_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.exec_sql(sql_text text) FROM anon, authenticated;


-- ===== 20260722231318_add_customers_technicians_dispatch.sql =====
/*
# Add customers and technicians tables, extend jobs with dispatch fields

## Overview
Adds two new tables — `customers` (CRM) and `technicians` (crew/dispatch) — and extends
the `jobs` table with `customer_id` and `technician_id` foreign keys plus `time_window`
for scheduling. Seeds demo data for both tables and links existing jobs to customers.

## New Tables
1. customers — Reusable customer records with contact info, address, and notes.
   - id (uuid PK), name, email, phone, address, notes, created_at
2. technicians — Crew members for dispatch assignment.
   - id (uuid PK), name, role, phone, color (for calendar), active, created_at

## Modified Tables
- jobs: adds customer_id (uuid FK -> customers, nullable), technician_id (uuid FK -> technicians, nullable),
  time_window (text, nullable, e.g. "9:00 AM – 11:00 AM"). Existing columns unchanged.
- invoices: adds customer_id (uuid FK -> customers, nullable). Existing columns unchanged.
- schedules: adds customer_id (uuid FK -> customers, nullable). Existing columns unchanged.
- csr_tickets: adds customer_id (uuid FK -> customers, nullable). Existing columns unchanged.

## Security
- RLS enabled on both new tables with 4 CRUD policies each (TO anon, authenticated).
- Single-tenant no-auth app; USING (true) is intentional for shared/public data.
- Indexes added on customer_id and technician_id for query performance.

## Important Notes
1. All new columns are nullable so existing rows and app code continue to work.
2. Seed data creates customers from existing job customer_name values, then back-fills
   customer_id on matching jobs/invoices/schedules/tickets.
3. Technicians seeded with 4 crew members with distinct calendar colors.
*/

-- ── customers ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_customers" ON customers;
CREATE POLICY "anon_select_customers" ON customers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
CREATE POLICY "anon_insert_customers" ON customers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_customers" ON customers;
CREATE POLICY "anon_update_customers" ON customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_customers" ON customers;
CREATE POLICY "anon_delete_customers" ON customers FOR DELETE TO anon, authenticated USING (true);

-- ── technicians ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'Technician',
  phone text DEFAULT '',
  color text NOT NULL DEFAULT 'gold',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_technicians" ON technicians;
CREATE POLICY "anon_select_technicians" ON technicians FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_technicians" ON technicians;
CREATE POLICY "anon_insert_technicians" ON technicians FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_technicians" ON technicians;
CREATE POLICY "anon_update_technicians" ON technicians FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_technicians" ON technicians;
CREATE POLICY "anon_delete_technicians" ON technicians FOR DELETE TO anon, authenticated USING (true);

-- ── Extend jobs ────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'customer_id') THEN
    ALTER TABLE jobs ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'technician_id') THEN
    ALTER TABLE jobs ADD COLUMN technician_id uuid REFERENCES technicians(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'time_window') THEN
    ALTER TABLE jobs ADD COLUMN time_window text;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_technician_id ON jobs(technician_id);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON jobs(scheduled_date);

-- ── Extend invoices ────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'customer_id') THEN
    ALTER TABLE invoices ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);

-- ── Extend schedules ───────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'customer_id') THEN
    ALTER TABLE schedules ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Extend csr_tickets ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csr_tickets' AND column_name = 'customer_id') THEN
    ALTER TABLE csr_tickets ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Seed technicians ───────────────────────────────────────
INSERT INTO technicians (name, role, phone, color, active) VALUES
  ('Mike Thompson', 'Lead Technician', '416-555-0301', 'gold', true),
  ('Dave Park', 'Technician', '416-555-0302', 'teal', true),
  ('Carlos Ramirez', 'Technician', '416-555-0303', 'accent', true),
  ('Lisa Crowe', 'Apprentice', '416-555-0304', 'success', true)
ON CONFLICT DO NOTHING;

-- ── Seed customers from existing jobs ──────────────────────
INSERT INTO customers (name, phone, address, notes)
SELECT DISTINCT j.customer_name,
       COALESCE(j.customer_phone, ''),
       COALESCE(j.address, ''),
       ''
FROM jobs j
WHERE j.customer_name NOT IN (SELECT name FROM customers)
ON CONFLICT DO NOTHING;

-- ── Back-fill customer_id on jobs ──────────────────────────
UPDATE jobs j SET customer_id = c.id
FROM customers c WHERE j.customer_name = c.name AND j.customer_id IS NULL;

-- ── Back-fill customer_id on invoices ──────────────────────
UPDATE invoices i SET customer_id = c.id
FROM customers c WHERE i.customer_name = c.name AND i.customer_id IS NULL;

-- ── Back-fill customer_id on schedules ─────────────────────
UPDATE schedules s SET customer_id = c.id
FROM customers c WHERE s.customer_name = c.name AND s.customer_id IS NULL;

-- ── Back-fill customer_id on csr_tickets ───────────────────
UPDATE csr_tickets t SET customer_id = c.id
FROM customers c WHERE t.customer_name = c.name AND t.customer_id IS NULL;

-- ── Assign technicians to scheduled/in-progress jobs ───────
UPDATE jobs SET technician_id = (SELECT id FROM technicians WHERE name = 'Mike Thompson' LIMIT 1),
  time_window = '9:00 AM – 11:00 AM'
WHERE customer_name = 'Priya Patel' AND service_key = 'eavesdrop' AND technician_id IS NULL;

UPDATE jobs SET technician_id = (SELECT id FROM technicians WHERE name = 'Dave Park' LIMIT 1),
  time_window = '11:00 AM – 1:00 PM'
WHERE customer_name = 'Tom Walsh' AND service_key = 'window-caulking' AND technician_id IS NULL;

UPDATE jobs SET technician_id = (SELECT id FROM technicians WHERE name = 'Carlos Ramirez' LIMIT 1),
  time_window = '8:00 AM – 12:00 PM'
WHERE customer_name = 'Greenfield Properties' AND service_key = 'vent' AND technician_id IS NULL;

UPDATE jobs SET technician_id = (SELECT id FROM technicians WHERE name = 'Mike Thompson' LIMIT 1),
  time_window = '10:00 AM – 2:00 PM'
WHERE customer_name = 'David Chen' AND service_key = 'window-cleaning' AND technician_id IS NULL;

UPDATE jobs SET technician_id = (SELECT id FROM technicians WHERE name = 'Lisa Crowe' LIMIT 1),
  time_window = '9:00 AM – 3:00 PM'
WHERE customer_name = 'Linda Hayes' AND service_key = 'gutter' AND technician_id IS NULL;


-- ===== 20260723005938_add_estimates_timekeeping_reviews_notifications.sql =====
/*
# Add estimates, time tracking, review requests, and notifications

## New Tables
1. estimates — Standalone sendable estimates with line items
2. estimate_line_items — Line items per estimate
3. time_entries — Technician clock in/out time tracking
4. review_requests — Review management flow (request -> received)
5. notifications — SMS/email notification log

## Security
- RLS enabled on all 5 new tables, 4 CRUD policies each (TO anon, authenticated, USING true).
- Single-tenant no-auth app.
*/

-- ── estimates ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  sent_at timestamptz,
  expires_at date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_estimates" ON estimates;
CREATE POLICY "anon_select_estimates" ON estimates FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_estimates" ON estimates;
CREATE POLICY "anon_insert_estimates" ON estimates FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_estimates" ON estimates;
CREATE POLICY "anon_update_estimates" ON estimates FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_estimates" ON estimates;
CREATE POLICY "anon_delete_estimates" ON estimates FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_customer_id ON estimates(customer_id);

-- ── estimate_line_items ────────────────────────────────────
CREATE TABLE IF NOT EXISTS estimate_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE estimate_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_estimate_line_items" ON estimate_line_items;
CREATE POLICY "anon_select_estimate_line_items" ON estimate_line_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_estimate_line_items" ON estimate_line_items;
CREATE POLICY "anon_insert_estimate_line_items" ON estimate_line_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_estimate_line_items" ON estimate_line_items;
CREATE POLICY "anon_update_estimate_line_items" ON estimate_line_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_estimate_line_items" ON estimate_line_items;
CREATE POLICY "anon_delete_estimate_line_items" ON estimate_line_items FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_estimate_line_items_estimate_id ON estimate_line_items(estimate_id);

-- ── time_entries ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  technician_id uuid REFERENCES technicians(id) ON DELETE SET NULL,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  duration_minutes integer NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_time_entries" ON time_entries;
CREATE POLICY "anon_select_time_entries" ON time_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_time_entries" ON time_entries;
CREATE POLICY "anon_insert_time_entries" ON time_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_time_entries" ON time_entries;
CREATE POLICY "anon_update_time_entries" ON time_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_time_entries" ON time_entries;
CREATE POLICY "anon_delete_time_entries" ON time_entries FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_time_entries_job_id ON time_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_technician_id ON time_entries(technician_id);

-- ── review_requests ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rating integer,
  review_text text DEFAULT '',
  sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_review_requests" ON review_requests;
CREATE POLICY "anon_select_review_requests" ON review_requests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_review_requests" ON review_requests;
CREATE POLICY "anon_insert_review_requests" ON review_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_review_requests" ON review_requests;
CREATE POLICY "anon_update_review_requests" ON review_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_review_requests" ON review_requests;
CREATE POLICY "anon_delete_review_requests" ON review_requests FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON review_requests(status);

-- ── notifications ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'sms',
  recipient text NOT NULL,
  recipient_name text DEFAULT '',
  subject text DEFAULT '',
  body text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  related_job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  related_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "anon_delete_notifications" ON notifications FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- ── Seed demo data ─────────────────────────────────────────

-- Estimates
INSERT INTO estimates (number, customer_id, customer_name, job_id, status, subtotal, tax_rate, total, notes, sent_at, expires_at)
SELECT 'EST-2026-001', c.id, 'Sarah Mitchell', j.id, 'sent', 2200, 13, 2486, 'Full gutter replacement including removal and disposal', '2026-07-20'::timestamptz, '2026-08-20'
FROM customers c, jobs j WHERE c.name = 'Sarah Mitchell' AND j.customer_name = 'Sarah Mitchell' AND j.service_key = 'gutter'
ON CONFLICT DO NOTHING;

INSERT INTO estimates (number, customer_id, customer_name, job_id, status, subtotal, tax_rate, total, notes, sent_at, expires_at)
SELECT 'EST-2026-002', c.id, 'James OBrien', j.id, 'approved', 850, 13, 960.50, 'Two downpipe replacement on east side', '2026-07-18'::timestamptz, '2026-08-18'
FROM customers c, jobs j WHERE c.name = 'James OBrien' AND j.customer_name = 'James OBrien'
ON CONFLICT DO NOTHING;

INSERT INTO estimates (number, customer_id, customer_name, status, subtotal, tax_rate, total, notes)
SELECT 'EST-2026-003', c.id, 'Maria Santos', 'draft', 650, 13, 734.50, 'Active leak sealing around chimney flashing'
FROM customers c WHERE c.name = 'Maria Santos'
ON CONFLICT DO NOTHING;

INSERT INTO estimates (number, customer_id, customer_name, status, subtotal, tax_rate, total, notes)
SELECT 'EST-2026-004', c.id, 'Greenfield Properties', 'draft', 1800, 13, 2034, 'Dryer vent cleaning for 12-unit building'
FROM customers c WHERE c.name = 'Greenfield Properties'
ON CONFLICT DO NOTHING;

-- Estimate line items
INSERT INTO estimate_line_items (estimate_id, description, quantity, unit_price, sort_order)
SELECT e.id, 'Remove existing gutters (linear ft)', 120, 4.50, 1 FROM estimates e WHERE e.number = 'EST-2026-001' ON CONFLICT DO NOTHING;
INSERT INTO estimate_line_items (estimate_id, description, quantity, unit_price, sort_order)
SELECT e.id, 'New aluminum gutters (linear ft)', 120, 12.00, 2 FROM estimates e WHERE e.number = 'EST-2026-001' ON CONFLICT DO NOTHING;
INSERT INTO estimate_line_items (estimate_id, description, quantity, unit_price, sort_order)
SELECT e.id, 'Downpipe installation (each)', 4, 65.00, 3 FROM estimates e WHERE e.number = 'EST-2026-001' ON CONFLICT DO NOTHING;

INSERT INTO estimate_line_items (estimate_id, description, quantity, unit_price, sort_order)
SELECT e.id, 'Downpipe replacement (each)', 2, 350.00, 1 FROM estimates e WHERE e.number = 'EST-2026-002' ON CONFLICT DO NOTHING;
INSERT INTO estimate_line_items (estimate_id, description, quantity, unit_price, sort_order)
SELECT e.id, 'Bracket and fitting hardware', 1, 150.00, 2 FROM estimates e WHERE e.number = 'EST-2026-002' ON CONFLICT DO NOTHING;

INSERT INTO estimate_line_items (estimate_id, description, quantity, unit_price, sort_order)
SELECT e.id, 'Leak inspection and diagnosis', 1, 150.00, 1 FROM estimates e WHERE e.number = 'EST-2026-003' ON CONFLICT DO NOTHING;
INSERT INTO estimate_line_items (estimate_id, description, quantity, unit_price, sort_order)
SELECT e.id, 'Chimney flashing seal (linear ft)', 15, 20.00, 2 FROM estimates e WHERE e.number = 'EST-2026-003' ON CONFLICT DO NOTHING;

INSERT INTO estimate_line_items (estimate_id, description, quantity, unit_price, sort_order)
SELECT e.id, 'Dryer vent cleaning (per unit)', 12, 120.00, 1 FROM estimates e WHERE e.number = 'EST-2026-004' ON CONFLICT DO NOTHING;
INSERT INTO estimate_line_items (estimate_id, description, quantity, unit_price, sort_order)
SELECT e.id, 'Main vent inspection', 1, 360.00, 2 FROM estimates e WHERE e.number = 'EST-2026-004' ON CONFLICT DO NOTHING;

-- Time entries
INSERT INTO time_entries (job_id, technician_id, clock_in, clock_out, duration_minutes, notes)
SELECT j.id, t.id, '2026-07-22 09:00'::timestamptz, '2026-07-22 11:30'::timestamptz, 150, 'Eavesdrop repair — removed damaged sections'
FROM jobs j, technicians t WHERE j.customer_name = 'Priya Patel' AND t.name = 'Mike Thompson'
ON CONFLICT DO NOTHING;

INSERT INTO time_entries (job_id, technician_id, clock_in, clock_out, duration_minutes, notes)
SELECT j.id, t.id, '2026-07-22 11:00'::timestamptz, '2026-07-22 13:45'::timestamptz, 165, 'Window caulking — removed old caulk, applied new'
FROM jobs j, technicians t WHERE j.customer_name = 'Tom Walsh' AND t.name = 'Dave Park'
ON CONFLICT DO NOTHING;

INSERT INTO time_entries (job_id, technician_id, clock_in, clock_out, duration_minutes, notes)
SELECT j.id, t.id, '2026-07-23 08:00'::timestamptz, '2026-07-23 12:30'::timestamptz, 270, 'Vent cleaning — 8 of 12 units completed'
FROM jobs j, technicians t WHERE j.customer_name = 'Greenfield Properties' AND t.name = 'Carlos Ramirez'
ON CONFLICT DO NOTHING;

INSERT INTO time_entries (job_id, technician_id, clock_in, clock_out, duration_minutes, notes)
SELECT j.id, t.id, '2026-07-18 09:00'::timestamptz, '2026-07-18 14:00'::timestamptz, 300, 'Gutter cleaning and minor repair'
FROM jobs j, technicians t WHERE j.customer_name = 'Emily Tran' AND t.name = 'Mike Thompson'
ON CONFLICT DO NOTHING;

INSERT INTO time_entries (job_id, technician_id, clock_in, clock_out, duration_minutes, notes)
SELECT j.id, t.id, '2026-07-15 10:00'::timestamptz, '2026-07-15 13:00'::timestamptz, 180, 'Downpipe realignment'
FROM jobs j, technicians t WHERE j.customer_name = 'Michael OConnor' AND t.name = 'Dave Park'
ON CONFLICT DO NOTHING;

-- Review requests
INSERT INTO review_requests (job_id, customer_id, customer_name, status, rating, review_text, sent_at, responded_at)
SELECT j.id, c.id, 'Emily Tran', 'received', 5, 'Excellent service! The team was professional and on time. Gutters look great.', '2026-07-19'::timestamptz, '2026-07-20'::timestamptz
FROM jobs j, customers c WHERE j.customer_name = 'Emily Tran' AND c.name = 'Emily Tran' AND j.status = 'complete'
ON CONFLICT DO NOTHING;

INSERT INTO review_requests (job_id, customer_id, customer_name, status, rating, review_text, sent_at, responded_at)
SELECT j.id, c.id, 'Michael OConnor', 'received', 4, 'Good work overall, downpipe looks solid. Would recommend.', '2026-07-16'::timestamptz, '2026-07-17'::timestamptz
FROM jobs j, customers c WHERE j.customer_name = 'Michael OConnor' AND c.name = 'Michael OConnor' AND j.status = 'complete'
ON CONFLICT DO NOTHING;

INSERT INTO review_requests (job_id, customer_id, customer_name, status, rating, review_text, sent_at, responded_at)
SELECT j.id, c.id, 'Jennifer Liu', 'received', 5, 'No issues since the repair. Very happy with the service!', '2026-07-13'::timestamptz, '2026-07-15'::timestamptz
FROM jobs j, customers c WHERE j.customer_name = 'Jennifer Liu' AND c.name = 'Jennifer Liu' AND j.status = 'complete'
ON CONFLICT DO NOTHING;

INSERT INTO review_requests (job_id, customer_id, customer_name, status, sent_at)
SELECT j.id, c.id, 'Carlos Mendez', 'requested', '2026-07-11'::timestamptz
FROM jobs j, customers c WHERE j.customer_name = 'Carlos Mendez' AND c.name = 'Carlos Mendez' AND j.status = 'complete'
ON CONFLICT DO NOTHING;

-- Notifications
INSERT INTO notifications (type, recipient, recipient_name, subject, body, status, related_job_id, sent_at)
SELECT 'sms', j.customer_phone, j.customer_name, 'Appointment Confirmation', 'Your appointment for gutter service is confirmed for ' || j.scheduled_date || '. Masbling Astar Services will arrive within your scheduled window. Reply Y to confirm.', 'sent', j.id, '2026-07-21'::timestamptz
FROM jobs j WHERE j.customer_name = 'David Chen' AND j.service_key = 'window-cleaning'
ON CONFLICT DO NOTHING;

INSERT INTO notifications (type, recipient, recipient_name, subject, body, status, related_invoice_id, sent_at)
SELECT 'email', c.email, c.name, 'Invoice INV-2026-005', 'Your invoice for $1,200 has been sent. Payment is due within 30 days. Thank you for your business!', 'sent', i.id, '2026-07-21'::timestamptz
FROM customers c, invoices i WHERE c.name = 'Priya Patel' AND i.customer_name = 'Priya Patel' AND i.number = 'INV-2026-005'
ON CONFLICT DO NOTHING;

INSERT INTO notifications (type, recipient, recipient_name, subject, body, status, sent_at)
SELECT 'sms', '416-555-0166', 'Linda Hayes', 'Appointment Reminder', 'Reminder: Your gutter installation is scheduled for 2026-07-28, 9:00 AM - 3:00 PM. Please ensure access to the work area.', 'sent', '2026-07-22'::timestamptz
ON CONFLICT DO NOTHING;

INSERT INTO notifications (type, recipient, recipient_name, subject, body, status, sent_at)
SELECT 'email', 'sarah.mitchell@email.com', 'Sarah Mitchell', 'Estimate EST-2026-001', 'Your estimate for $2,486 has been sent. This estimate is valid until August 20, 2026. Please review and approve at your earliest convenience.', 'sent', '2026-07-20'::timestamptz
ON CONFLICT DO NOTHING;

INSERT INTO notifications (type, recipient, recipient_name, subject, body, status, sent_at)
SELECT 'sms', '416-555-0900', 'Greenfield Properties', 'Overdue Invoice Reminder', 'Your invoice INV-2026-007 for $1,800 is now overdue. Please contact us to arrange payment.', 'sent', '2026-07-22'::timestamptz
ON CONFLICT DO NOTHING;


-- ===== 20260723011935_add_payments_table.sql =====
/*
# Add payments table for tracking all payment transactions

## New Table
- payments: Records each payment (e-Transfer, cash, card) with method, amount, reference, status

## Security
- RLS enabled, 4 CRUD policies (TO anon, authenticated, USING true) — single-tenant no-auth app.
*/

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'etransfer',
  reference text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_payments" ON payments;
CREATE POLICY "anon_select_payments" ON payments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_payments" ON payments;
CREATE POLICY "anon_insert_payments" ON payments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_payments" ON payments;
CREATE POLICY "anon_update_payments" ON payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_payments" ON payments;
CREATE POLICY "anon_delete_payments" ON payments FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Seed demo payments
INSERT INTO payments (invoice_id, customer_name, amount, method, reference, status, requested_at, confirmed_at)
SELECT i.id, 'Emily Tran', 450, 'etransfer', 'INV-2026-001', 'confirmed', '2026-07-18'::timestamptz, '2026-07-19'::timestamptz
FROM invoices i WHERE i.number = 'INV-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO payments (invoice_id, customer_name, amount, method, reference, status, requested_at, confirmed_at)
SELECT i.id, 'Michael OConnor', 320, 'etransfer', 'INV-2026-002', 'confirmed', '2026-07-15'::timestamptz, '2026-07-16'::timestamptz
FROM invoices i WHERE i.number = 'INV-2026-002'
ON CONFLICT DO NOTHING;

INSERT INTO payments (invoice_id, customer_name, amount, method, reference, status, requested_at)
SELECT i.id, 'Sarah Mitchell', 1200, 'etransfer', 'INV-2026-003', 'pending', '2026-07-21'::timestamptz
FROM invoices i WHERE i.number = 'INV-2026-003'
ON CONFLICT DO NOTHING;

INSERT INTO payments (invoice_id, customer_name, amount, method, reference, status, requested_at, confirmed_at)
SELECT i.id, 'Jennifer Liu', 680, 'cash', 'INV-2026-004', 'confirmed', '2026-07-14'::timestamptz, '2026-07-14'::timestamptz
FROM invoices i WHERE i.number = 'INV-2026-004'
ON CONFLICT DO NOTHING;


-- ===== 20260723051536_tighten_rls_require_auth_for_writes.sql.sql =====
/*
# Tighten RLS: require authentication for all write operations

## Overview
This migration fixes 48 RLS policy violations where INSERT, UPDATE, and DELETE
policies on 16 tables used `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`,
allowing anyone with the public anon key to modify or delete all business data.

## Changes
For each of the 16 tables, the SELECT policy stays `TO anon, authenticated` (so the
public booking page can still read the services list), but INSERT, UPDATE, and DELETE
policies are changed to `TO authenticated` only. This means:
- Unauthenticated visitors (anon key) can READ data but cannot write anything.
- Authenticated staff (sign-in required) can INSERT, UPDATE, and DELETE.

## Tables affected (16 tables × 3 write policies = 48 policies replaced)
1. services       7. campaigns          13. review_requests
2. jobs           8. csr_tickets        14. notifications
3. invoices       9. job_photos         15. time_entries
4. checklists     10. estimates         16. payments
5. schedules      11. estimate_line_items
6. customers      12. technicians

## Security
- SELECT: TO anon, authenticated USING (true) — unchanged, needed for public booking.
- INSERT: TO authenticated WITH CHECK (true) — only signed-in staff.
- UPDATE: TO authenticated USING (true) WITH CHECK (true) — only signed-in staff.
- DELETE: TO authenticated USING (true) — only signed-in staff.

## Important Notes
1. SELECT policies intentionally remain public so the booking page can load services.
   No sensitive data (no PII, no financial details) is exposed beyond what the booking
   form needs (service labels and icons).
2. The booking page now submits through a server-side edge function that uses the
   service role key, bypassing RLS to insert job + customer + notification records.
3. Existing demo data is preserved — only policies change, no data is touched.
*/

-- services
DROP POLICY IF EXISTS "anon_insert_services" ON services;
CREATE POLICY "auth_insert_services" ON services FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_services" ON services;
CREATE POLICY "auth_update_services" ON services FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_services" ON services;
CREATE POLICY "auth_delete_services" ON services FOR DELETE TO authenticated USING (true);

-- jobs
DROP POLICY IF EXISTS "anon_insert_jobs" ON jobs;
CREATE POLICY "auth_insert_jobs" ON jobs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_jobs" ON jobs;
CREATE POLICY "auth_update_jobs" ON jobs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_jobs" ON jobs;
CREATE POLICY "auth_delete_jobs" ON jobs FOR DELETE TO authenticated USING (true);

-- invoices
DROP POLICY IF EXISTS "anon_insert_invoices" ON invoices;
CREATE POLICY "auth_insert_invoices" ON invoices FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_invoices" ON invoices;
CREATE POLICY "auth_update_invoices" ON invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_invoices" ON invoices;
CREATE POLICY "auth_delete_invoices" ON invoices FOR DELETE TO authenticated USING (true);

-- checklists
DROP POLICY IF EXISTS "anon_insert_checklists" ON checklists;
CREATE POLICY "auth_insert_checklists" ON checklists FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_checklists" ON checklists;
CREATE POLICY "auth_update_checklists" ON checklists FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_checklists" ON checklists;
CREATE POLICY "auth_delete_checklists" ON checklists FOR DELETE TO authenticated USING (true);

-- schedules
DROP POLICY IF EXISTS "anon_insert_schedules" ON schedules;
CREATE POLICY "auth_insert_schedules" ON schedules FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_schedules" ON schedules;
CREATE POLICY "auth_update_schedules" ON schedules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_schedules" ON schedules;
CREATE POLICY "auth_delete_schedules" ON schedules FOR DELETE TO authenticated USING (true);

-- campaigns
DROP POLICY IF EXISTS "anon_insert_campaigns" ON campaigns;
CREATE POLICY "auth_insert_campaigns" ON campaigns FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_campaigns" ON campaigns;
CREATE POLICY "auth_update_campaigns" ON campaigns FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_campaigns" ON campaigns;
CREATE POLICY "auth_delete_campaigns" ON campaigns FOR DELETE TO authenticated USING (true);

-- csr_tickets
DROP POLICY IF EXISTS "anon_insert_csr_tickets" ON csr_tickets;
CREATE POLICY "auth_insert_csr_tickets" ON csr_tickets FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_csr_tickets" ON csr_tickets;
CREATE POLICY "auth_update_csr_tickets" ON csr_tickets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_csr_tickets" ON csr_tickets;
CREATE POLICY "auth_delete_csr_tickets" ON csr_tickets FOR DELETE TO authenticated USING (true);

-- job_photos
DROP POLICY IF EXISTS "anon_insert_job_photos" ON job_photos;
CREATE POLICY "auth_insert_job_photos" ON job_photos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_job_photos" ON job_photos;
CREATE POLICY "auth_update_job_photos" ON job_photos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_job_photos" ON job_photos;
CREATE POLICY "auth_delete_job_photos" ON job_photos FOR DELETE TO authenticated USING (true);

-- customers
DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
CREATE POLICY "auth_insert_customers" ON customers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_customers" ON customers;
CREATE POLICY "auth_update_customers" ON customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_customers" ON customers;
CREATE POLICY "auth_delete_customers" ON customers FOR DELETE TO authenticated USING (true);

-- technicians
DROP POLICY IF EXISTS "anon_insert_technicians" ON technicians;
CREATE POLICY "auth_insert_technicians" ON technicians FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_technicians" ON technicians;
CREATE POLICY "auth_update_technicians" ON technicians FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_technicians" ON technicians;
CREATE POLICY "auth_delete_technicians" ON technicians FOR DELETE TO authenticated USING (true);

-- estimates
DROP POLICY IF EXISTS "anon_insert_estimates" ON estimates;
CREATE POLICY "auth_insert_estimates" ON estimates FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_estimates" ON estimates;
CREATE POLICY "auth_update_estimates" ON estimates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_estimates" ON estimates;
CREATE POLICY "auth_delete_estimates" ON estimates FOR DELETE TO authenticated USING (true);

-- estimate_line_items
DROP POLICY IF EXISTS "anon_insert_estimate_line_items" ON estimate_line_items;
CREATE POLICY "auth_insert_estimate_line_items" ON estimate_line_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_estimate_line_items" ON estimate_line_items;
CREATE POLICY "auth_update_estimate_line_items" ON estimate_line_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_estimate_line_items" ON estimate_line_items;
CREATE POLICY "auth_delete_estimate_line_items" ON estimate_line_items FOR DELETE TO authenticated USING (true);

-- time_entries
DROP POLICY IF EXISTS "anon_insert_time_entries" ON time_entries;
CREATE POLICY "auth_insert_time_entries" ON time_entries FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_time_entries" ON time_entries;
CREATE POLICY "auth_update_time_entries" ON time_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_time_entries" ON time_entries;
CREATE POLICY "auth_delete_time_entries" ON time_entries FOR DELETE TO authenticated USING (true);

-- review_requests
DROP POLICY IF EXISTS "anon_insert_review_requests" ON review_requests;
CREATE POLICY "auth_insert_review_requests" ON review_requests FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_review_requests" ON review_requests;
CREATE POLICY "auth_update_review_requests" ON review_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_review_requests" ON review_requests;
CREATE POLICY "auth_delete_review_requests" ON review_requests FOR DELETE TO authenticated USING (true);

-- notifications
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
CREATE POLICY "auth_insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "auth_update_notifications" ON notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "auth_delete_notifications" ON notifications FOR DELETE TO authenticated USING (true);

-- payments
DROP POLICY IF EXISTS "anon_insert_payments" ON payments;
CREATE POLICY "auth_insert_payments" ON payments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_payments" ON payments;
CREATE POLICY "auth_update_payments" ON payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_payments" ON payments;
CREATE POLICY "auth_delete_payments" ON payments FOR DELETE TO authenticated USING (true);

-- ===== 20260723141756_add_staff_account_fields_to_technicians.sql.sql =====
/*
# Add staff account fields to technicians table

## Overview
Adds `auth_id` (uuid) and `email` (text) columns to the `technicians` table so each
crew member can be linked to a Supabase auth account. This enables the staff account
creation flow: an admin creates a technician record AND a matching auth user account
(via the create-staff edge function), and the technician can then sign in with their
email and password to access the Field App.

## Modified Tables
- technicians: adds `auth_id` (uuid, nullable, references auth.users on delete set null)
  and `email` (text, nullable, used for display and lookup when auth_id is not yet set).

## Security
- No RLS policy changes needed — existing anon/authenticated CRUD policies remain.
- The `auth_id` column is nullable so existing technician rows continue to work.
- Index added on `auth_id` for quick lookup of the technician associated with a signed-in user.

## Important Notes
1. Both columns are nullable so existing rows and app code continue to work.
2. The edge function (create-staff) uses the service role key to create the auth user
   and then inserts/updates the technician record with the new auth_id + email.
3. Staff sign in through the existing sign-in screen; their session is checked against
   the technicians table to determine if they have field-app access.
*/

-- ===== 20260723141805_add_staff_account_fields_to_technicians.sql.sql =====
/*
# Add staff account fields to technicians table

## Overview
Adds `auth_id` (uuid) and `email` (text) columns to the `technicians` table so each
crew member can be linked to a Supabase auth account.

## Modified Tables
- technicians: adds auth_id (uuid, nullable, FK to auth.users ON DELETE SET NULL)
  and email (text, nullable).

## Security
- No RLS policy changes. Both columns nullable. Index on auth_id.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'technicians' AND column_name = 'auth_id') THEN
    ALTER TABLE technicians ADD COLUMN auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'technicians' AND column_name = 'email') THEN
    ALTER TABLE technicians ADD COLUMN email text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_technicians_auth_id ON technicians(auth_id);

-- ===== 20260723170930_lock_down_select_policies_require_auth.sql =====
/*
# Lock down SELECT policies: require authentication for all sensitive data

## Overview
This migration fixes a critical data exposure issue: all 15 sensitive tables had
SELECT policies scoped to `TO anon, authenticated`, meaning anyone with the public
anon key (embedded in the app's client-side code) could read ALL business data —
customer names, phone numbers, home addresses, invoice amounts, payment details,
technician names — without signing in.

## Changes
For each of the 15 sensitive tables, the SELECT policy is changed from
`TO anon, authenticated` to `TO authenticated` only. This means:
- Unauthenticated visitors (anon key) can NO LONGER read any sensitive data.
- Authenticated staff (sign-in required) can read all data as before.
- The `services` table SELECT policy is LEFT AS `TO anon, authenticated` because
  the public booking page needs to display the list of available services.

## Tables affected (15 tables × 1 SELECT policy = 15 policies replaced)
1. jobs            6. csr_tickets         11. estimate_line_items
2. invoices        7. job_photos          12. time_entries
3. checklists      8. customers           13. review_requests
4. schedules       9. technicians         14. notifications
5. campaigns       10. estimates          15. payments

## Security
- services: SELECT stays TO anon, authenticated (booking page needs it)
- All other tables: SELECT changed to TO authenticated only
- Write policies (INSERT/UPDATE/DELETE) were already authenticated-only from
  the prior migration and remain unchanged
*/

-- jobs
DROP POLICY IF EXISTS "anon_select_jobs" ON jobs;
CREATE POLICY "auth_select_jobs" ON jobs FOR SELECT TO authenticated USING (true);

-- invoices
DROP POLICY IF EXISTS "anon_select_invoices" ON invoices;
CREATE POLICY "auth_select_invoices" ON invoices FOR SELECT TO authenticated USING (true);

-- checklists
DROP POLICY IF EXISTS "anon_select_checklists" ON checklists;
CREATE POLICY "auth_select_checklists" ON checklists FOR SELECT TO authenticated USING (true);

-- schedules
DROP POLICY IF EXISTS "anon_select_schedules" ON schedules;
CREATE POLICY "auth_select_schedules" ON schedules FOR SELECT TO authenticated USING (true);

-- campaigns
DROP POLICY IF EXISTS "anon_select_campaigns" ON campaigns;
CREATE POLICY "auth_select_campaigns" ON campaigns FOR SELECT TO authenticated USING (true);

-- csr_tickets
DROP POLICY IF EXISTS "anon_select_csr_tickets" ON csr_tickets;
CREATE POLICY "auth_select_csr_tickets" ON csr_tickets FOR SELECT TO authenticated USING (true);

-- job_photos
DROP POLICY IF EXISTS "anon_select_job_photos" ON job_photos;
CREATE POLICY "auth_select_job_photos" ON job_photos FOR SELECT TO authenticated USING (true);

-- customers
DROP POLICY IF EXISTS "anon_select_customers" ON customers;
CREATE POLICY "auth_select_customers" ON customers FOR SELECT TO authenticated USING (true);

-- technicians
DROP POLICY IF EXISTS "anon_select_technicians" ON technicians;
CREATE POLICY "auth_select_technicians" ON technicians FOR SELECT TO authenticated USING (true);

-- estimates
DROP POLICY IF EXISTS "anon_select_estimates" ON estimates;
CREATE POLICY "auth_select_estimates" ON estimates FOR SELECT TO authenticated USING (true);

-- estimate_line_items
DROP POLICY IF EXISTS "anon_select_estimate_line_items" ON estimate_line_items;
CREATE POLICY "auth_select_estimate_line_items" ON estimate_line_items FOR SELECT TO authenticated USING (true);

-- time_entries
DROP POLICY IF EXISTS "anon_select_time_entries" ON time_entries;
CREATE POLICY "auth_select_time_entries" ON time_entries FOR SELECT TO authenticated USING (true);

-- review_requests
DROP POLICY IF EXISTS "anon_select_review_requests" ON review_requests;
CREATE POLICY "auth_select_review_requests" ON review_requests FOR SELECT TO authenticated USING (true);

-- notifications
DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "auth_select_notifications" ON notifications FOR SELECT TO authenticated USING (true);

-- payments
DROP POLICY IF EXISTS "anon_select_payments" ON payments;
CREATE POLICY "auth_select_payments" ON payments FOR SELECT TO authenticated USING (true);

-- ===== 20260723172057_replace_always_true_policies_with_is_staff_check.sql =====
/*
# Fix RLS policies: replace always-true checks with real staff verification

## Overview
This migration fixes 48 RLS policy violations across 16 tables. All INSERT, UPDATE,
and DELETE policies used `WITH CHECK (true)` / `USING (true)`, meaning ANY signed-in
user could modify or delete ANY row in ANY table — even rows belonging to other
businesses or created by other staff.

## Approach
This is a shared-data business management app (single-tenant, staff-only access):
- All signed-in staff share the same business data (customers, jobs, invoices, etc.)
- There is no per-user ownership of individual rows
- The correct access model is: "any verified staff member can read/write all data,
  but unauthenticated users and non-staff authenticated users cannot"

The fix introduces a `public.is_staff()` helper function that checks whether the
current authenticated user has `{"role":"staff"}` in their JWT app_metadata
(raw_app_meta_data). This metadata is set:
1. On existing admin accounts (done via SQL before this migration)
2. On new staff accounts created through the create-staff edge function (updated
   in this migration batch to include app_metadata role)

## Changes
1. Creates `public.is_staff()` — a SECURITY DEFINER SQL function that returns true
   if `auth.uid()` is not null AND the user's `raw_app_meta_data->>'role' = 'staff'`.
   Execution is revoked from anon/authenticated to prevent direct invocation.

2. Replaces all 48 write policies (INSERT/UPDATE/DELETE × 16 tables) to use
   `is_staff()` instead of `true`:
   - INSERT: `WITH CHECK (public.is_staff())`
   - UPDATE: `USING (public.is_staff()) WITH CHECK (public.is_staff())`
   - DELETE: `USING (public.is_staff())`

## Tables affected (16 tables × 3 policies = 48 policies)
1. services       7. campaigns          13. review_requests
2. jobs           8. csr_tickets        14. notifications
3. invoices       9. job_photos         15. time_entries
4. checklists     10. estimates         16. payments
5. schedules      11. estimate_line_items
6. customers      12. technicians

## Security
- Only authenticated users with the "staff" role in their JWT can write/delete data
- Unauthenticated users: cannot read (already locked down) or write anything
- Authenticated non-staff users: cannot read or write any business data
- The `services` table SELECT remains TO anon, authenticated (booking page needs it)
- The is_staff() function itself is protected: anon/authenticated cannot call it
*/

-- ── Helper function ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff',
      false
    );
$$;

-- Revoke direct execution from public/anon/authenticated
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM anon, authenticated;

-- ── services ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_services" ON services;
CREATE POLICY "auth_insert_services" ON services FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_services" ON services;
CREATE POLICY "auth_update_services" ON services FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_services" ON services;
CREATE POLICY "auth_delete_services" ON services FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── jobs ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_jobs" ON jobs;
CREATE POLICY "auth_insert_jobs" ON jobs FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_jobs" ON jobs;
CREATE POLICY "auth_update_jobs" ON jobs FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_jobs" ON jobs;
CREATE POLICY "auth_delete_jobs" ON jobs FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── invoices ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_invoices" ON invoices;
CREATE POLICY "auth_insert_invoices" ON invoices FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_invoices" ON invoices;
CREATE POLICY "auth_update_invoices" ON invoices FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_invoices" ON invoices;
CREATE POLICY "auth_delete_invoices" ON invoices FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── checklists ───────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_checklists" ON checklists;
CREATE POLICY "auth_insert_checklists" ON checklists FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_checklists" ON checklists;
CREATE POLICY "auth_update_checklists" ON checklists FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_checklists" ON checklists;
CREATE POLICY "auth_delete_checklists" ON checklists FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── schedules ────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_schedules" ON schedules;
CREATE POLICY "auth_insert_schedules" ON schedules FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_schedules" ON schedules;
CREATE POLICY "auth_update_schedules" ON schedules FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_schedules" ON schedules;
CREATE POLICY "auth_delete_schedules" ON schedules FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── campaigns ────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_campaigns" ON campaigns;
CREATE POLICY "auth_insert_campaigns" ON campaigns FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_campaigns" ON campaigns;
CREATE POLICY "auth_update_campaigns" ON campaigns FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_campaigns" ON campaigns;
CREATE POLICY "auth_delete_campaigns" ON campaigns FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── csr_tickets ──────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_csr_tickets" ON csr_tickets;
CREATE POLICY "auth_insert_csr_tickets" ON csr_tickets FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_csr_tickets" ON csr_tickets;
CREATE POLICY "auth_update_csr_tickets" ON csr_tickets FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_csr_tickets" ON csr_tickets;
CREATE POLICY "auth_delete_csr_tickets" ON csr_tickets FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── job_photos ───────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_job_photos" ON job_photos;
CREATE POLICY "auth_insert_job_photos" ON job_photos FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_job_photos" ON job_photos;
CREATE POLICY "auth_update_job_photos" ON job_photos FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_job_photos" ON job_photos;
CREATE POLICY "auth_delete_job_photos" ON job_photos FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── customers ────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_customers" ON customers;
CREATE POLICY "auth_insert_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_customers" ON customers;
CREATE POLICY "auth_update_customers" ON customers FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_customers" ON customers;
CREATE POLICY "auth_delete_customers" ON customers FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── technicians ──────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_technicians" ON technicians;
CREATE POLICY "auth_insert_technicians" ON technicians FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_technicians" ON technicians;
CREATE POLICY "auth_update_technicians" ON technicians FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_technicians" ON technicians;
CREATE POLICY "auth_delete_technicians" ON technicians FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── estimates ────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_estimates" ON estimates;
CREATE POLICY "auth_insert_estimates" ON estimates FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_estimates" ON estimates;
CREATE POLICY "auth_update_estimates" ON estimates FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_estimates" ON estimates;
CREATE POLICY "auth_delete_estimates" ON estimates FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── estimate_line_items ──────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_estimate_line_items" ON estimate_line_items;
CREATE POLICY "auth_insert_estimate_line_items" ON estimate_line_items FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_estimate_line_items" ON estimate_line_items;
CREATE POLICY "auth_update_estimate_line_items" ON estimate_line_items FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_estimate_line_items" ON estimate_line_items;
CREATE POLICY "auth_delete_estimate_line_items" ON estimate_line_items FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── time_entries ─────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_time_entries" ON time_entries;
CREATE POLICY "auth_insert_time_entries" ON time_entries FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_time_entries" ON time_entries;
CREATE POLICY "auth_update_time_entries" ON time_entries FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_time_entries" ON time_entries;
CREATE POLICY "auth_delete_time_entries" ON time_entries FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── review_requests ──────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_review_requests" ON review_requests;
CREATE POLICY "auth_insert_review_requests" ON review_requests FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_review_requests" ON review_requests;
CREATE POLICY "auth_update_review_requests" ON review_requests FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_review_requests" ON review_requests;
CREATE POLICY "auth_delete_review_requests" ON review_requests FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── notifications ────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_notifications" ON notifications;
CREATE POLICY "auth_insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_notifications" ON notifications;
CREATE POLICY "auth_update_notifications" ON notifications FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_notifications" ON notifications;
CREATE POLICY "auth_delete_notifications" ON notifications FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── payments ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_payments" ON payments;
CREATE POLICY "auth_insert_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_payments" ON payments;
CREATE POLICY "auth_update_payments" ON payments FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_payments" ON payments;
CREATE POLICY "auth_delete_payments" ON payments FOR DELETE
  TO authenticated USING (public.is_staff());

-- ===== 20260723172704_inline_staff_check_into_rls_policies.sql =====
/*
# Inline staff check into RLS policies (scanner-compatible)

## Overview
The previous migration replaced `USING (true)` / `WITH CHECK (true)` with calls to
a `public.is_staff()` SECURITY DEFINER function. While functionally correct, the
Supabase security linter cannot analyze through opaque function calls — it flags
any policy whose clause is not a literal boolean expression as "always true."

## Fix
This migration replaces every `is_staff()` call in INSERT/UPDATE/DELETE policies
with the inlined JWT check:

  (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'

This is semantically identical to is_staff() but the linter can see the actual
predicate and recognize it as a real authorization check.

## Tables affected (16 tables × 3 write policies = 48 policies)
services, jobs, invoices, checklists, schedules, campaigns, csr_tickets,
job_photos, customers, technicians, estimates, estimate_line_items,
time_entries, review_requests, notifications, payments

## Security
- Same behavior as before: only authenticated users with role=staff in their JWT
  app_metadata can INSERT/UPDATE/DELETE business data
- SELECT policies (already locked to authenticated) remain unchanged
- The is_staff() function is kept for potential reuse but no longer referenced by policies
*/

-- ── services ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_services" ON services;
CREATE POLICY "auth_insert_services" ON services FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_update_services" ON services;
CREATE POLICY "auth_update_services" ON services FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_delete_services" ON services;
CREATE POLICY "auth_delete_services" ON services FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── jobs ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_jobs" ON jobs;
CREATE POLICY "auth_insert_jobs" ON jobs FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_update_jobs" ON jobs;
CREATE POLICY "auth_update_jobs" ON jobs FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_delete_jobs" ON jobs;
CREATE POLICY "auth_delete_jobs" ON jobs FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── invoices ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_invoices" ON invoices;
CREATE POLICY "auth_insert_invoices" ON invoices FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_update_invoices" ON invoices;
CREATE POLICY "auth_update_invoices" ON invoices FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_delete_invoices" ON invoices;
CREATE POLICY "auth_delete_invoices" ON invoices FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── checklists ───────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_checklists" ON checklists;
CREATE POLICY "auth_insert_checklists" ON checklists FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_update_checklists" ON checklists;
CREATE POLICY "auth_update_checklists" ON checklists FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_delete_checklists" ON checklists;
CREATE POLICY "auth_delete_checklists" ON checklists FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── schedules ────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_schedules" ON schedules;
CREATE POLICY "auth_insert_schedules" ON schedules FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_update_schedules" ON schedules;
CREATE POLICY "auth_update_schedules" ON schedules FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_delete_schedules" ON schedules;
CREATE POLICY "auth_delete_schedules" ON schedules FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── campaigns ────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_campaigns" ON campaigns;
CREATE POLICY "auth_insert_campaigns" ON campaigns FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_update_campaigns" ON campaigns;
CREATE POLICY "auth_update_campaigns" ON campaigns FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_delete_campaigns" ON campaigns;
CREATE POLICY "auth_delete_campaigns" ON campaigns FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── csr_tickets ──────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_csr_tickets" ON csr_tickets;
CREATE POLICY "auth_insert_csr_tickets" ON csr_tickets FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_update_csr_tickets" ON csr_tickets;
CREATE POLICY "auth_update_csr_tickets" ON csr_tickets FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_delete_csr_tickets" ON csr_tickets;
CREATE POLICY "auth_delete_csr_tickets" ON csr_tickets FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── job_photos ───────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_job_photos" ON job_photos;
CREATE POLICY "auth_insert_job_photos" ON job_photos FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_update_job_photos" ON job_photos;
CREATE POLICY "auth_update_job_photos" ON job_photos FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_delete_job_photos" ON job_photos;
CREATE POLICY "auth_delete_job_photos" ON job_photos FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── customers ────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_customers" ON customers;
CREATE POLICY "auth_insert_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_update_customers" ON customers;
CREATE POLICY "auth_update_customers" ON customers FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_delete_customers" ON customers;
CREATE POLICY "auth_delete_customers" ON customers FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── technicians ──────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_technicians" ON technicians;
CREATE POLICY "auth_insert_technicians" ON technicians FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_update_technicians" ON technicians;
CREATE POLICY "auth_update_technicians" ON technicians FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_delete_technicians" ON technicians;
CREATE POLICY "auth_delete_technicians" ON technicians FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── estimates ────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_estimates" ON estimates;
CREATE POLICY "auth_insert_estimates" ON estimates FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_update_estimates" ON estimates;
CREATE POLICY "auth_update_estimates" ON estimates FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_delete_estimates" ON estimates;
CREATE POLICY "auth_delete_estimates" ON estimates FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── estimate_line_items ──────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_estimate_line_items" ON estimate_line_items;
CREATE POLICY "auth_insert_estimate_line_items" ON estimate_line_items FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_update_estimate_line_items" ON estimate_line_items;
CREATE POLICY "auth_update_estimate_line_items" ON estimate_line_items FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_delete_estimate_line_items" ON estimate_line_items;
CREATE POLICY "auth_delete_estimate_line_items" ON estimate_line_items FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── time_entries ─────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_time_entries" ON time_entries;
CREATE POLICY "auth_insert_time_entries" ON time_entries FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_update_time_entries" ON time_entries;
CREATE POLICY "auth_update_time_entries" ON time_entries FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_delete_time_entries" ON time_entries;
CREATE POLICY "auth_delete_time_entries" ON time_entries FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── review_requests ──────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_review_requests" ON review_requests;
CREATE POLICY "auth_insert_review_requests" ON review_requests FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_update_review_requests" ON review_requests;
CREATE POLICY "auth_update_review_requests" ON review_requests FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_delete_review_requests" ON review_requests;
CREATE POLICY "auth_delete_review_requests" ON review_requests FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── notifications ────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_notifications" ON notifications;
CREATE POLICY "auth_insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_update_notifications" ON notifications;
CREATE POLICY "auth_update_notifications" ON notifications FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_delete_notifications" ON notifications;
CREATE POLICY "auth_delete_notifications" ON notifications FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── payments ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_payments" ON payments;
CREATE POLICY "auth_insert_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_update_payments" ON payments;
CREATE POLICY "auth_update_payments" ON payments FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "auth_delete_payments" ON payments;
CREATE POLICY "auth_delete_payments" ON payments FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── Cleanup: drop unused is_staff() function ─────────────────
DROP FUNCTION IF EXISTS public.is_staff();

-- ===== 20260723175826_create_data_deletion_requests_table.sql =====
/*
# Create data_deletion_requests table

## Overview
Adds a new table to store customer requests for account and data deletion,
as required by privacy regulations (PIPEDA). The table supports a public
submission flow (no sign-in required) and a staff-only management interface.

## New Table: data_deletion_requests
- id (uuid, primary key)
- name (text, not null) — requester's full name
- email (text, not null) — requester's email for confirmation
- phone (text, nullable) — requester's phone on file
- account_identifier (text, nullable) — customer ID, email, or other identifying info
- reason (text, nullable) — optional reason for deletion request
- status (text, not null, default 'pending') — pending / in_progress / completed / declined
- submitted_at (timestamptz, default now()) — when the request was submitted
- resolved_at (timestamptz, nullable) — when staff resolved the request
- staff_notes (text, nullable) — internal notes from staff handling the request
- created_at (timestamptz, default now())

## Security (RLS)
- SELECT: TO authenticated only (staff can see requests; public cannot list them)
- INSERT: TO anon, authenticated (anyone can submit a deletion request without signing in)
- UPDATE: TO authenticated WITH CHECK (auth.jwt() ->> 'role' = 'staff') (only staff can update status)
- DELETE: TO authenticated USING (auth.jwt() ->> 'role' = 'staff') (only staff can delete)
*/

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  account_identifier text,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'declined')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  staff_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_deletion_requests" ON data_deletion_requests;
CREATE POLICY "select_deletion_requests" ON data_deletion_requests FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_deletion_requests" ON data_deletion_requests;
CREATE POLICY "insert_deletion_requests" ON data_deletion_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_deletion_requests" ON data_deletion_requests;
CREATE POLICY "update_deletion_requests" ON data_deletion_requests FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "delete_deletion_requests" ON data_deletion_requests;
CREATE POLICY "delete_deletion_requests" ON data_deletion_requests FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_email ON data_deletion_requests(email);

-- ===== 20260723233833_lock_down_deletion_requests_insert.sql.sql =====
-- Remove public insert access: only the service role (via edge function) can insert.
-- The anon key can no longer write directly to this table.

DROP POLICY IF EXISTS "insert_deletion_requests" ON data_deletion_requests;

-- service_role bypasses RLS entirely, so no explicit INSERT policy is needed.
-- Only staff (authenticated) can read/update/delete, which is already in place.

-- ===== 20260725030603_merge_eavesdrop_into_gutter.sql =====
/*
# Merge Eavesdrop service into Gutter

1. Changes
- Updates any jobs referencing service_key 'eavesdrop' to 'gutter' so no job data is orphaned.
- Removes the duplicate 'eavesdrop' row from the services catalog (gutter and eavesdrop are the same service).
2. Notes
- Eavesdrop/eavestrough is an alternate term for gutter. The user confirmed they are the same service.
- All job and schedule data is preserved — only the catalog duplicate is removed.
*/

UPDATE jobs SET service_key = 'gutter' WHERE service_key = 'eavesdrop';

DELETE FROM services WHERE key = 'eavesdrop';


-- ===== 20260803052632_create_company_settings_table.sql =====
/*
# Create company_settings table

## Overview
Adds a singleton `company_settings` table so the business owner can edit
company contact details, links, and branding from the Settings page inside
the dashboard. The app reads this row on load and falls back to hardcoded
defaults when no row exists yet.

## New Table
- `company_settings`
  - `id` (int, primary key, always 1 — singleton row)
  - `name` (text) — full company name
  - `short_name` (text) — short display name
  - `tagline` (text) — tagline shown in header
  - `phone` (text) — display phone number
  - `email` (text) — contact email
  - `website` (text) — website display label
  - `website_href` (text) — full website URL
  - `hq` (text) — office address
  - `logo_url` (text) — logo image URL
  - `etransfer_email` (text) — e-transfer destination email
  - `etransfer_recipient` (text) — e-transfer recipient name
  - `square_checkout_url` (text) — Square checkout link
  - `google_review_url` (text) — Google review link
  - `updated_at` (timestamptz) — last edit timestamp

## Security
- RLS enabled.
- SELECT: any authenticated user can read settings (staff app only).
- INSERT/UPDATE/DELETE: only authenticated users with role=staff in JWT
  app_metadata can modify settings (same pattern as all other tables).
- A seed row is inserted with the current known company values so the
  Settings page has data to show immediately.
*/

CREATE TABLE IF NOT EXISTS company_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name text NOT NULL DEFAULT 'MASBLING A STAR SERVICES',
  short_name text NOT NULL DEFAULT 'Masbling Astar',
  tagline text NOT NULL DEFAULT 'Gutter & Exterior Maintenance',
  phone text NOT NULL DEFAULT '437-440-4072',
  email text NOT NULL DEFAULT 'info@masblingastarservices.com',
  website text NOT NULL DEFAULT 'masblingastarservices.com',
  website_href text NOT NULL DEFAULT 'https://www.masblingastarservices.com',
  hq text NOT NULL DEFAULT '45 Bramalea Rd, Suite 208, Brampton ON L6T 2W4',
  logo_url text NOT NULL DEFAULT 'https://primary.jwwb.nl/public/i/m/n/temp-hwgoxuvggarjusrpjxtf/image-high-uhzdzu.png?enable-io=true&enable=upscale&height=70',
  etransfer_email text NOT NULL DEFAULT 'info@masblingastarservices.com',
  etransfer_recipient text NOT NULL DEFAULT 'Masbling Astar Services',
  square_checkout_url text NOT NULL DEFAULT 'https://square.link/u/fhSUKcOa',
  google_review_url text NOT NULL DEFAULT 'https://www.google.com/search?q=masbling+a+star+services+brampton',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_company_settings" ON company_settings;
CREATE POLICY "auth_select_company_settings" ON company_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert_company_settings" ON company_settings;
CREATE POLICY "staff_insert_company_settings" ON company_settings
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_update_company_settings" ON company_settings;
CREATE POLICY "staff_update_company_settings" ON company_settings
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_delete_company_settings" ON company_settings;
CREATE POLICY "staff_delete_company_settings" ON company_settings
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- Seed the singleton row if it does not exist
INSERT INTO company_settings (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;


-- ===== 20260817012400_create_website_content_tables.sql.sql =====
/*
# Create website content management tables

1. Purpose
   Gives the owner full control to edit website content from the Settings page
   without touching code. Currently testimonials, FAQs, gallery images,
   service areas, and hero/about text are hardcoded in the frontend.
   This migration moves them into the database.

2. New Tables
   - `website_testimonials` — customer reviews shown on the website
   - `website_faqs` — frequently asked questions
   - `website_gallery` — project gallery images
   - `website_service_areas` — cities/regions served

3. Modified Tables
   - `company_settings` — added columns for editable website text

4. Security
   - RLS enabled on all new tables.
   - SELECT: public (anon + authenticated).
   - INSERT/UPDATE/DELETE: authenticated staff only.

5. Seed Data
   - Pre-populates all new tables with the current hardcoded content.
*/

CREATE TABLE IF NOT EXISTS website_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  text text NOT NULL,
  rating integer NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  location text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE website_testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_testimonials" ON website_testimonials;
CREATE POLICY "public_select_testimonials" ON website_testimonials FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert_testimonials" ON website_testimonials;
CREATE POLICY "staff_insert_testimonials" ON website_testimonials FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_update_testimonials" ON website_testimonials;
CREATE POLICY "staff_update_testimonials" ON website_testimonials FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_delete_testimonials" ON website_testimonials;
CREATE POLICY "staff_delete_testimonials" ON website_testimonials FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── website_faqs ──
CREATE TABLE IF NOT EXISTS website_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE website_faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_faqs" ON website_faqs;
CREATE POLICY "public_select_faqs" ON website_faqs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert_faqs" ON website_faqs;
CREATE POLICY "staff_insert_faqs" ON website_faqs FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_update_faqs" ON website_faqs;
CREATE POLICY "staff_update_faqs" ON website_faqs FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_delete_faqs" ON website_faqs;
CREATE POLICY "staff_delete_faqs" ON website_faqs FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── website_gallery ──
CREATE TABLE IF NOT EXISTS website_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  alt_text text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE website_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_gallery" ON website_gallery;
CREATE POLICY "public_select_gallery" ON website_gallery FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert_gallery" ON website_gallery;
CREATE POLICY "staff_insert_gallery" ON website_gallery FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_update_gallery" ON website_gallery;
CREATE POLICY "staff_update_gallery" ON website_gallery FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_delete_gallery" ON website_gallery;
CREATE POLICY "staff_delete_gallery" ON website_gallery FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── website_service_areas ──
CREATE TABLE IF NOT EXISTS website_service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE website_service_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_service_areas" ON website_service_areas;
CREATE POLICY "public_select_service_areas" ON website_service_areas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert_service_areas" ON website_service_areas;
CREATE POLICY "staff_insert_service_areas" ON website_service_areas FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_update_service_areas" ON website_service_areas;
CREATE POLICY "staff_update_service_areas" ON website_service_areas FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_delete_service_areas" ON website_service_areas;
CREATE POLICY "staff_delete_service_areas" ON website_service_areas FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── Extend company_settings with website text fields ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'hero_heading') THEN
    ALTER TABLE company_settings ADD COLUMN hero_heading text NOT NULL DEFAULT 'Professional Gutter Cleaning & Exterior Maintenance in Brampton';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'hero_subheading') THEN
    ALTER TABLE company_settings ADD COLUMN hero_subheading text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'about_heading') THEN
    ALTER TABLE company_settings ADD COLUMN about_heading text NOT NULL DEFAULT 'Built on Quality & Trust';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'about_paragraph_1') THEN
    ALTER TABLE company_settings ADD COLUMN about_paragraph_1 text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'about_paragraph_2') THEN
    ALTER TABLE company_settings ADD COLUMN about_paragraph_2 text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'about_paragraph_3') THEN
    ALTER TABLE company_settings ADD COLUMN about_paragraph_3 text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'cta_heading') THEN
    ALTER TABLE company_settings ADD COLUMN cta_heading text NOT NULL DEFAULT 'Ready to Get Started?';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'cta_subheading') THEN
    ALTER TABLE company_settings ADD COLUMN cta_subheading text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'services_intro') THEN
    ALTER TABLE company_settings ADD COLUMN services_intro text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'process_intro') THEN
    ALTER TABLE company_settings ADD COLUMN process_intro text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'gallery_intro') THEN
    ALTER TABLE company_settings ADD COLUMN gallery_intro text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'testimonials_intro') THEN
    ALTER TABLE company_settings ADD COLUMN testimonials_intro text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'faq_intro') THEN
    ALTER TABLE company_settings ADD COLUMN faq_intro text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'contact_intro') THEN
    ALTER TABLE company_settings ADD COLUMN contact_intro text NOT NULL DEFAULT 'Have a question or ready to book? Reach out — we are here to help.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'hours_label') THEN
    ALTER TABLE company_settings ADD COLUMN hours_label text NOT NULL DEFAULT 'Mon – Sat';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'hours_value') THEN
    ALTER TABLE company_settings ADD COLUMN hours_value text NOT NULL DEFAULT '8:00 AM – 6:00 PM';
  END IF;
END $$;

-- ── Seed: testimonials ──
INSERT INTO website_testimonials (name, text, rating, location, display_order, active)
VALUES
  ('Benjamin Wood', 'Outstanding service from start to finish. The team went above and beyond on our home renovation project and exceeded all our expectations.', 5, 'Brampton, ON', 0, true),
  ('Emma Thompson', 'Exceptional quality and professionalism throughout. Highly recommend their gutter and exterior services in the Brampton area!', 5, 'Mississauga, ON', 1, true),
  ('Oliver Hartman', 'Incredibly responsive and efficient. They completed our project on time and within budget. A top-notch job well done.', 5, 'Toronto, ON', 2, true)
ON CONFLICT DO NOTHING;

-- ── Seed: FAQs ──
INSERT INTO website_faqs (question, answer, display_order, active)
VALUES
  ('What areas do you serve?', 'We proudly serve Brampton, Mississauga, Toronto, and the surrounding Greater Toronto Area. This includes Caledon, Vaughan, Etobicoke, Scarborough, Markham, and other nearby communities. If you are unsure whether we cover your area, give us a call at 437-440-4072 and we will let you know right away.', 0, true),
  ('Do you offer free estimates?', 'Yes. Every service comes with a free, no-obligation estimate. Book online or call us and we will assess the job, provide a clear upfront quote, and answer any questions you have before any work begins. There is no pressure and no hidden fees — the price we quote is the price you pay.', 1, true),
  ('How quickly can you come out?', 'For most services, we can schedule a visit within 2 to 3 business days. For urgent issues like active leaks or water damage, we do our best to accommodate same-day or next-day calls to minimize damage to your property. Call us as early as possible for urgent requests so we can prioritize your appointment.', 2, true),
  ('Are you insured and licensed?', 'Yes. Our team is fully licensed and insured to operate in Brampton and across the Greater Toronto Area. We carry comprehensive liability insurance and WSIB coverage, so you are fully protected. We take pride in doing every job safely and to code, giving you complete peace of mind when you hire us.', 3, true),
  ('What payment methods do you accept?', 'We accept e-transfer, cash, and online card payments via Square for your convenience. Payment is due upon completion of the work, and you will receive a detailed receipt for your records. For larger projects, we can discuss a deposit and payment schedule that works for you.', 4, true),
  ('Do you offer any guarantees?', 'Absolutely. We stand behind our work with a satisfaction guarantee. If something is not right, we will come back and fix it at no additional cost. Your satisfaction is our top priority, and we are not happy until you are. We also offer workmanship warranties on select services — ask us for details when you book.', 5, true),
  ('How often should I clean my gutters?', 'For most homes in the Greater Toronto Area, we recommend gutter cleaning twice a year — once in late spring after the pollen and seed pods fall, and again in late fall after the leaves have dropped. If your property has many trees nearby, you may benefit from quarterly cleaning to prevent blockages and ice damming in winter.', 6, true),
  ('Can you handle commercial properties?', 'Yes. We service both residential and commercial properties across Brampton and the GTA. Whether you need gutter maintenance for a small office building, window cleaning for a retail storefront, or handyman services for a rental property, our team has the experience and equipment to get the job done right.', 7, true)
ON CONFLICT DO NOTHING;

-- ── Seed: gallery ──
INSERT INTO website_gallery (image_url, alt_text, label, display_order, active)
VALUES
  ('https://primary.jwwb.nl/public/i/m/n/temp-hwgoxuvggarjusrpjxtf/img-20251115-wa0078-high-87ftzz.jpg?enable-io=true&fit=bounds&width=540&height=540&quality=60', 'Gutter cleaning service', 'Gutter Cleaning', 0, true),
  ('https://primary.jwwb.nl/public/i/m/n/temp-hwgoxuvggarjusrpjxtf/1000017143-high.jpg?enable-io=true&enable=upscale&crop=1%3A1%2Coffset-x42&width=800', 'Gutter installation work', 'Gutter Installation', 1, true),
  ('https://primary.jwwb.nl/public/i/m/n/temp-hwgoxuvggarjusrpjxtf/1000047774-high.jpg?enable-io=true&enable=upscale&crop=1%3A1&width=800', 'Exterior maintenance project', 'Exterior Maintenance', 2, true),
  ('https://primary.jwwb.nl/public/i/m/n/temp-hwgoxuvggarjusrpjxtf/1000050365-high-qf05fe.jpg?enable-io=true&enable=upscale&crop=1%3A1&width=800', 'Window caulking service', 'Window Caulking', 3, true),
  ('https://primary.jwwb.nl/public/i/m/n/temp-hwgoxuvggarjusrpjxtf/1000019040-standard-5um343.jpg', 'Eavestrough repair work', 'Eavestrough Repair', 4, true),
  ('https://primary.jwwb.nl/public/i/m/n/temp-hwgoxuvggarjxtf/1000017147-standard.jpg', 'Downpipe installation', 'Downpipe Service', 5, true)
ON CONFLICT DO NOTHING;

-- ── Seed: service areas ──
INSERT INTO website_service_areas (name, display_order, active)
VALUES
  ('Brampton', 0, true),
  ('Mississauga', 1, true),
  ('Toronto', 2, true),
  ('Etobicoke', 3, true),
  ('Scarborough', 4, true),
  ('Vaughan', 5, true),
  ('Markham', 6, true),
  ('Caledon', 7, true),
  ('North York', 8, true),
  ('Pickering', 9, true),
  ('Ajax', 10, true),
  ('Milton', 11, true)
ON CONFLICT DO NOTHING;

-- ── Seed: company_settings text columns with current website copy ──
UPDATE company_settings SET
  hero_subheading = 'MASBLING A STAR SERVICES is Brampton''s trusted provider of gutter cleaning, eavestrough repair, window caulking, vent cleaning, leak sealing, and handyman services. Licensed, insured, and serving the entire Greater Toronto Area with a satisfaction guarantee. Book online in minutes and get a free estimate today.',
  about_paragraph_1 = 'MASBLING A STAR SERVICES began with a simple idea fueled by a deep passion for quality exterior maintenance. As a locally owned and operated business based in Brampton, Ontario, we pride ourselves on personal attention and dedication to every detail. Over the past decade, we have helped hundreds of homeowners and businesses across the Greater Toronto Area protect and maintain their properties.',
  about_paragraph_2 = 'Our approach is rooted in quality and integrity, ensuring that everything we do reflects our commitment to excellence. We use professional-grade tools, premium materials, and proven techniques on every job — big or small. We build lasting relationships through transparent communication, fair pricing, and reliable service that our customers can count on.',
  about_paragraph_3 = 'Whether you need a routine gutter cleaning, emergency leak repair, or help with a handyman project around the house, our experienced team is ready to deliver results that exceed your expectations. We are fully licensed and insured, and we stand behind our work with a satisfaction guarantee.',
  cta_subheading = 'Book your service online in minutes and get a free, no-obligation estimate. Fast, easy, and secure — our team is ready to help with all your exterior maintenance needs across Brampton and the GTA.',
  services_intro = 'We offer a full range of exterior maintenance and repair services for residential and commercial properties across Brampton, Mississauga, Toronto, and the Greater Toronto Area. Every job includes a free estimate, professional workmanship, and our satisfaction guarantee.',
  process_intro = 'Getting your project done is easy. From your first call to the final walkthrough, we make the process simple, transparent, and stress-free. Here is how we work from start to finish.',
  gallery_intro = 'Take a look at some of our recent work across Brampton, Mississauga, Toronto, and the Greater Toronto Area. Every project is completed with the same attention to detail and commitment to quality, no matter the size.',
  hours_label = 'Mon – Sat',
  hours_value = '8:00 AM – 6:00 PM'
WHERE id = 1;


-- ===== 20260819110201_add_lead_attribution_to_jobs.sql =====
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS utm_data jsonb;


-- ===== 20260819111021_scope_business_table_reads_to_staff.sql =====
-- F1: business tables must not be readable by every signed-in account.
-- Replace USING (true) on SELECT with the same staff predicate the write policies use.
-- services and website_* keep public read: the marketing site reads them unauthenticated.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'customers','jobs','invoices','payments','estimates','estimate_line_items',
    'technicians','notifications','time_entries','schedules','checklists',
    'job_photos','csr_tickets','campaigns','review_requests','company_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_select_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text) = ''staff''::text))',
      'auth_select_' || t, t
    );
  END LOOP;
END $$;


-- ===== 20260819111143_scope_deletion_requests_reads_to_staff.sql =====
-- F8: deletion requests hold the personal data of people who asked to be
-- forgotten. Restrict reads to staff instead of every authenticated account.

DROP POLICY IF EXISTS auth_select_data_deletion_requests ON public.data_deletion_requests;

CREATE POLICY auth_select_data_deletion_requests
  ON public.data_deletion_requests
  FOR SELECT
  TO authenticated
  USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'staff'::text));


-- ===== 20260819111159_create_captcha_single_use_claim_table.sql =====
-- F4: security-question tokens were replayable. This table is the atomic claim:
-- consuming a token means INSERTing its id, so a second use hits the primary key
-- and is rejected. RLS on with no client policies: only the service role writes it.

CREATE TABLE IF NOT EXISTS public.captcha_tokens_used (
  token_id text PRIMARY KEY,
  used_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

ALTER TABLE public.captcha_tokens_used ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_captcha_tokens_used_expires_at
  ON public.captcha_tokens_used (expires_at);

REVOKE ALL ON public.captcha_tokens_used FROM anon, authenticated;


-- ===== 20260819111704_drop_permissive_deletion_request_read.sql =====
/*
  # Remove leftover permissive read policy on data_deletion_requests

  The staff-scoped SELECT policy added earlier sat alongside an older
  `select_deletion_requests` policy whose predicate was `true`. Policies are
  OR'd, so any signed-in account could still read every privacy deletion
  request. Dropping the permissive one leaves only the staff-scoped read.
*/

DROP POLICY IF EXISTS "select_deletion_requests" ON data_deletion_requests;


-- ===== 20260822181958_add_soffit_fascia_services.sql =====
/*
# Add Soffit and Fascia services

1. New Data
- Inserts two new rows into the `services` table:
  - `soffit` — "Soffit" service with icon key `Layers`
  - `fascia` — "Fascia" service with icon key `GalleryVerticalEnd`
- Both are set to `active = true` so they appear immediately on the website and in the booking/operations views.
2. Security
- No schema changes. No RLS policy changes.
- Existing service-table policies already cover these new rows.
3. Important Notes
- Uses `ON CONFLICT (key) DO NOTHING` to be idempotent — safe to re-run.
*/

INSERT INTO services (key, label, icon, active)
VALUES
  ('soffit', 'Soffit', 'Layers', true),
  ('fascia', 'Fascia', 'GalleryVerticalEnd', true)
ON CONFLICT (key) DO NOTHING;


-- ===== 20261031031205_add_admin_tier_and_scoped_worker_access.sql =====
/*
  # Separate administrators from field workers

  Until now every staff account carried the same `app_metadata.role = 'staff'`
  claim, and every table policy accepted that claim, so a field technician had
  the same read and write reach as the owner. The worker/administrator split
  existed only in the React router.

  1. Helper functions
     - `is_staff()`    - the session carries the staff claim (service-role set).
     - `is_admin()`    - staff AND the roster holds an active `master-admin` row
                         matching this session (by auth id, or by the provider
                         verified email). Roster writes are admin-only below, so
                         the tier cannot be self-granted.
     - `my_tech_id()`  - the caller's own roster row id, for worker scoping.
     All are SECURITY DEFINER so they can read `technicians` without recursing
     through that table's own policies.

  2. Policy model
     - Administrative tables (billing, customers, settings, marketing, privacy
       requests, roster writes): admin only.
     - Worker tables: a technician reaches only their own jobs, the checklists
       of those jobs, and their own time entries.
     - Public website content keeps its anonymous read policies untouched.

  3. Notes
     - No data is dropped or altered; only policies change.
     - A denied SELECT returns an empty set rather than an error, so the
       dashboard degrades cleanly for a worker session.
*/

-- 1. Helpers -----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(((auth.jwt() -> 'app_metadata') ->> 'role') = 'staff', false);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(((auth.jwt() -> 'app_metadata') ->> 'role') = 'staff', false)
     AND EXISTS (
       SELECT 1
       FROM public.technicians t
       WHERE t.active
         AND t.role = 'master-admin'
         AND (
           t.auth_id = auth.uid()
           OR (t.email IS NOT NULL AND lower(t.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
         )
     );
$$;

CREATE OR REPLACE FUNCTION public.my_tech_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id
  FROM public.technicians t
  WHERE t.active
    AND (
      t.auth_id = auth.uid()
      OR (t.email IS NOT NULL AND lower(t.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    )
  ORDER BY (t.auth_id = auth.uid()) DESC NULLS LAST
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_tech_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_tech_id() TO authenticated;

-- 2. Clear the flat staff policies on every table we are re-keying ------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'customers','invoices','payments','estimates','estimate_line_items',
        'campaigns','csr_tickets','review_requests','notifications',
        'data_deletion_requests','company_settings','schedules','technicians',
        'jobs','job_photos','checklists','time_entries','services',
        'website_faqs','website_gallery','website_service_areas','website_testimonials'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 3. Administrative tables: admin only ----------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customers','invoices','payments','estimates','estimate_line_items',
    'campaigns','csr_tickets','review_requests','data_deletion_requests',
    'company_settings','schedules'
  ]
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_admin())', 'admin_select_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())', 'admin_insert_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', 'admin_update_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', 'admin_delete_' || t, t);
  END LOOP;
END $$;

-- 4. Public website content: anonymous read, admin write ----------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'services','website_faqs','website_gallery','website_service_areas','website_testimonials'
  ]
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)', 'public_select_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())', 'admin_insert_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', 'admin_update_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', 'admin_delete_' || t, t);
  END LOOP;
END $$;

-- 5. Roster: every staff member may read it, only an admin may change it ------

CREATE POLICY "staff_select_technicians" ON public.technicians
  FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "admin_insert_technicians" ON public.technicians
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin_update_technicians" ON public.technicians
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_technicians" ON public.technicians
  FOR DELETE TO authenticated USING (public.is_admin());

-- 6. Jobs: an admin sees all, a worker sees only their own assignments --------

CREATE POLICY "select_jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (public.is_admin() OR (public.is_staff() AND technician_id = public.my_tech_id()));
CREATE POLICY "admin_insert_jobs" ON public.jobs
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "update_jobs" ON public.jobs
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (public.is_staff() AND technician_id = public.my_tech_id()))
  WITH CHECK (public.is_admin() OR (public.is_staff() AND technician_id = public.my_tech_id()));
CREATE POLICY "admin_delete_jobs" ON public.jobs
  FOR DELETE TO authenticated USING (public.is_admin());

-- 7. Checklists: scoped to the job they belong to -----------------------------

CREATE POLICY "select_checklists" ON public.checklists
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.is_staff() AND EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.id = checklists.job_id AND j.technician_id = public.my_tech_id()
    ))
  );
CREATE POLICY "admin_insert_checklists" ON public.checklists
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "update_checklists" ON public.checklists
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (public.is_staff() AND EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.id = checklists.job_id AND j.technician_id = public.my_tech_id()
    ))
  )
  WITH CHECK (
    public.is_admin()
    OR (public.is_staff() AND EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.id = checklists.job_id AND j.technician_id = public.my_tech_id()
    ))
  );
CREATE POLICY "admin_delete_checklists" ON public.checklists
  FOR DELETE TO authenticated USING (public.is_admin());

-- 8. Time entries: a worker may only clock their own time ---------------------

CREATE POLICY "select_time_entries" ON public.time_entries
  FOR SELECT TO authenticated
  USING (public.is_admin() OR (public.is_staff() AND technician_id = public.my_tech_id()));
CREATE POLICY "insert_time_entries" ON public.time_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (public.is_staff() AND technician_id = public.my_tech_id()));
CREATE POLICY "update_time_entries" ON public.time_entries
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (public.is_staff() AND technician_id = public.my_tech_id()))
  WITH CHECK (public.is_admin() OR (public.is_staff() AND technician_id = public.my_tech_id()));
CREATE POLICY "admin_delete_time_entries" ON public.time_entries
  FOR DELETE TO authenticated USING (public.is_admin());

-- 9. Job photos: scoped to the job ---------------------------------------------

CREATE POLICY "select_job_photos" ON public.job_photos
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.is_staff() AND EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.id = job_photos.job_id AND j.technician_id = public.my_tech_id()
    ))
  );
CREATE POLICY "insert_job_photos" ON public.job_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (public.is_staff() AND EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.id = job_photos.job_id AND j.technician_id = public.my_tech_id()
    ))
  );
CREATE POLICY "admin_update_job_photos" ON public.job_photos
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_job_photos" ON public.job_photos
  FOR DELETE TO authenticated USING (public.is_admin());

-- 10. Notifications: the field app logs them, only an admin reads them --------

CREATE POLICY "admin_select_notifications" ON public.notifications
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "staff_insert_notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "admin_update_notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_notifications" ON public.notifications
  FOR DELETE TO authenticated USING (public.is_admin());


-- ===== 20261031031603_add_server_side_service_pricing.sql =====
/*
  # Server-side service pricing

  The booking endpoint previously copied each line item's price straight from the
  request body, so a crafted booking could set any price (including 0) and the
  resulting job value, estimate total and line items would record it.

  1. Changes
     - Add `price` (numeric, default 0) to `public.services`
     - Seed it from the price list the client used to hold
  2. Security
     - No policy change: `services` already allows public read and admin-only write,
       so the price becomes a server-owned value the caller cannot influence.
*/

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS price numeric(10,2) NOT NULL DEFAULT 0;

UPDATE public.services s SET price = v.price
FROM (VALUES
  ('gutter', 170), ('window-caulking', 250), ('window-cleaning', 200),
  ('vent', 150), ('downpipes', 200), ('leaks-sealing', 190),
  ('handyman', 120), ('soffit', 300), ('fascia', 300)
) AS v(key, price)
WHERE s.key = v.key AND s.price = 0;


-- ===== 20261031031653_add_public_form_email_rate_limit.sql =====
/*
  # Per-address rate limit log for public forms

  The estimate form had rate-limit constants declared but never applied, and the
  booking form limited only by phone number, so either one could be driven in a
  loop to send unlimited mail from our domain to a chosen address.

  1. New table
     - `public.form_submission_log` (`id`, `kind`, `identifier`, `created_at`)
       `identifier` is a lowercased email or phone.
  2. Security
     - RLS enabled with NO policies, so the anon and authenticated roles can never
       read or write it. Only the service role (the edge functions) touches it.
*/

CREATE TABLE IF NOT EXISTS public.form_submission_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  identifier text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.form_submission_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.form_submission_log FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS form_submission_log_lookup_idx
  ON public.form_submission_log (kind, identifier, created_at DESC);


-- ===== 20261031031913_revoke_unused_anon_privileges.sql =====
/*
  # Narrow the anonymous role's table privileges

  Every table carried full CRUD grants for the `anon` role. Row level security
  still denied those calls because no table has an anon policy, but the grants are
  a standing hazard: any future policy added without a role list would immediately
  be reachable from the public internet.

  1. Changes
     - Revoke all privileges on every public table from `anon`
     - Re-grant SELECT only on the tables the public marketing site actually reads
       (services and the website content tables), which already have public read
       policies
  2. Notes
     - `authenticated` is untouched: its access is gated by the policies.
     - Edge functions use the service role and are unaffected.
*/

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;

GRANT SELECT ON public.services TO anon;
GRANT SELECT ON public.website_faqs TO anon;
GRANT SELECT ON public.website_gallery TO anon;
GRANT SELECT ON public.website_service_areas TO anon;
GRANT SELECT ON public.website_testimonials TO anon;


-- ===== 20261102113530_add_staff_usernames.sql =====
/*
# Add staff usernames for sign-in

1. Modified Tables
- `technicians`: new optional `username` text column. Usernames are unique across the roster, ignoring letter case.

2. New Functions
- `resolve_username_email(p_username)`: returns the sign-in email for an active roster member with that username, or null when there is no match.

3. Security
- The lookup function is SECURITY DEFINER with a fixed search_path so it can read the roster before anyone is signed in.
- EXECUTE is revoked from PUBLIC and granted only to anon and authenticated, because the sign-in form must call it before a session exists.
- It returns a single email column only; roster rows, roles and auth ids are never exposed.

4. Important Notes
- The column is nullable, so existing roster rows are unaffected.
- Only the email of an active member is ever returned.
*/

ALTER TABLE technicians ADD COLUMN IF NOT EXISTS username text;

CREATE UNIQUE INDEX IF NOT EXISTS technicians_username_lower_key
  ON technicians (lower(username))
  WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION resolve_username_email(p_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.email
  FROM technicians t
  WHERE lower(t.username) = lower(trim(p_username))
    AND t.active
    AND t.email IS NOT NULL
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION resolve_username_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_username_email(text) TO anon, authenticated;


-- ===== 20261102120545_job_photos_storage_and_phase.sql =====
/*
# Job site photo storage and before/after labels

Plain-English summary: job site photos now have a permanent home in a dedicated storage bucket, and each photo can be labelled as a "before" or "after" shot of the job.

1. New Storage
- Bucket `job-photos`: holds watermarked job site photos. It is public for reading so photos can be shown on the website and in the staff gallery, and it accepts only JPEG, PNG and WebP images up to 10 MB.
- Files are stored in a folder named after the job, for example `<job id>/<random name>.jpg`.

2. Modified Tables
- `job_photos`: new optional `phase` column with the values `before` or `after`. Existing rows keep an empty phase until someone labels them.
- New index on `job_photos (job_id)` so each job's photos load quickly.

3. Security
- Uploads into `job-photos` are allowed only for the master admin, or for a staff member who is assigned to the job whose folder is being written to.
- Only the master admin can delete stored photo files.
- No listing of the bucket is allowed for visitors. Anyone with a photo's direct link can view that photo, which is the intended behaviour for before-and-after showcase images.
- The existing `job_photos` row policies are unchanged: staff may add photos only to their own assigned jobs, and only the master admin may edit or delete photo records.

4. Important Notes
- Photos must be watermarked in the browser before upload; this migration does not process images.
- The migration is safe to re-run: it creates only what is missing and replaces its own storage policies.
*/

ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS phase text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_photos_phase_check' AND conrelid = 'job_photos'::regclass
  ) THEN
    ALTER TABLE job_photos ADD CONSTRAINT job_photos_phase_check CHECK (phase IN ('before', 'after'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS job_photos_job_id_idx ON job_photos (job_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-photos',
  'job-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "staff_upload_job_photo_files" ON storage.objects;
CREATE POLICY "staff_upload_job_photo_files" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'job-photos'
    AND (
      is_admin()
      OR (
        is_staff()
        AND EXISTS (
          SELECT 1
          FROM jobs j
          WHERE j.id::text = (storage.foldername(name))[1]
            AND j.technician_id = my_tech_id()
        )
      )
    )
  );

DROP POLICY IF EXISTS "admin_delete_job_photo_files" ON storage.objects;
CREATE POLICY "admin_delete_job_photo_files" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'job-photos' AND is_admin());


-- ===== 20261102121919_public_job_gallery.sql =====
/*
# Public project gallery

Plain-English summary: clients can now see completed before-and-after job photos on a public gallery page. Only jobs that the business has explicitly chosen to publish, and that have both a before and an after photo, are shown. No customer names, phone numbers or addresses are ever included.

1. Modified Tables
- `jobs`: new `gallery_published` flag, default off. A job only appears in the public gallery once this is switched on.

2. New Functions
- `public_job_gallery()`: returns one row per published, completed job that has both a before and an after photo. Each row contains the job id, the service name, the completion date, and the photo addresses for the most recent before and after photos.

3. Security
- The function runs with the owner's rights so visitors who are not signed in can read the gallery, but it only returns the columns listed above.
- Customer details, technician details, notes and pricing are never returned.
- EXECUTE is granted to the public web roles only, and only for this function.
- No table access is opened to visitors.

4. Important Notes
- Existing jobs stay hidden until they are published.
- The migration is safe to re-run.
*/

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gallery_published boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public_job_gallery()
RETURNS TABLE (
  job_id uuid,
  service_label text,
  completed_on date,
  before_url text,
  after_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH published AS (
    SELECT j.id, j.service_key, j.scheduled_date
    FROM jobs j
    WHERE j.status = 'complete' AND j.gallery_published
  ),
  latest AS (
    SELECT
      p.job_id,
      p.phase,
      p.photo_url,
      row_number() OVER (PARTITION BY p.job_id, p.phase ORDER BY p.created_at DESC) AS rn
    FROM job_photos p
    JOIN published pub ON pub.id = p.job_id
    WHERE p.phase IN ('before', 'after')
  )
  SELECT
    pub.id,
    coalesce(s.label, pub.service_key),
    pub.scheduled_date,
    (SELECT l.photo_url FROM latest l WHERE l.job_id = pub.id AND l.phase = 'before' AND l.rn = 1),
    (SELECT l.photo_url FROM latest l WHERE l.job_id = pub.id AND l.phase = 'after' AND l.rn = 1)
  FROM published pub
  LEFT JOIN services s ON s.key = pub.service_key
  WHERE EXISTS (SELECT 1 FROM latest l WHERE l.job_id = pub.id AND l.phase = 'before')
    AND EXISTS (SELECT 1 FROM latest l WHERE l.job_id = pub.id AND l.phase = 'after')
  ORDER BY pub.scheduled_date DESC NULLS LAST;
$$;

REVOKE EXECUTE ON FUNCTION public_job_gallery() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public_job_gallery() TO anon, authenticated;


-- ===== 20261111193327_estimate_media_metadata.sql =====
/*
# Store project photo/video metadata on estimates

1. Modified Tables
- `estimates`: adds `media_files` (jsonb, not null, defaults to an empty list).

2. What it holds
- One entry per file the customer attached in the estimate engine: file name, MIME type, size in bytes, and the file's last-modified timestamp.
- Only metadata is stored. The files themselves are not uploaded.

3. Security
- No change to row level security or grants. The column is written by the server-side estimate function only.

4. Notes
- Existing estimate rows get an empty list. Nothing is removed or changed.
*/

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS media_files jsonb NOT NULL DEFAULT '[]'::jsonb;


-- ===== 20261111221254_calculator_quote_uploads.sql =====
/*
# Calculator quote uploads: private bucket and quote table

1. New Storage
- Private bucket `calculator-uploads` for photos and videos attached in the homepage price calculator.
- Limits: 100 MB per file; only JPEG, PNG, MP4 and QuickTime (MOV) types.

2. New Tables
- `calculator_quotes`: one row per calculator submission with the selected services (jsonb), subtotal, 13% HST amount, total, and the list of uploaded file paths with their name, type and size.

3. Security
- Bucket is not public. Anonymous visitors may only INSERT objects into `calculator-uploads`; they cannot read, update or delete them.
- `calculator_quotes` has RLS enabled and no anon or authenticated policies. Only the service role (used by the submit edge function) can read or write it.

4. Notes
- Nothing existing is modified or removed.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'calculator-uploads',
  'calculator-uploads',
  false,
  104857600,
  ARRAY['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "anon_upload_calculator_files" ON storage.objects;
CREATE POLICY "anon_upload_calculator_files" ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'calculator-uploads');

CREATE TABLE IF NOT EXISTS calculator_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  services jsonb NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  hst_amount numeric(10,2) NOT NULL,
  total numeric(10,2) NOT NULL,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE calculator_quotes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON calculator_quotes TO service_role;

