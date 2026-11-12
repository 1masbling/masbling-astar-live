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