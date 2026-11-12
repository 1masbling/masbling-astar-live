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
