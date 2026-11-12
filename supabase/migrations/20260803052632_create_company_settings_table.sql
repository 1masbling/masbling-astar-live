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
