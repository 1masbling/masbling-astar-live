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
  ('gutter', 'Gutter', 'CloudRain'),
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