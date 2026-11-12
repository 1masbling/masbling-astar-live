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
