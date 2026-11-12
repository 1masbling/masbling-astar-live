-- Removes sample records from the original demo seeds: jobs, schedules, invoices,
-- CSR tickets, campaigns, demo customers (555 phone numbers), and demo technicians.
-- Leaves services, RECENT PROJECTS gallery pictures, and the owner account untouched.
-- Run in the Supabase SQL Editor. Safe to re-run (matches nothing once removed).

DO $$
DECLARE
  v_job_ids uuid[];
BEGIN
  SELECT coalesce(array_agg(j.id), '{}')
  INTO v_job_ids
  FROM jobs j
  WHERE (j.customer_name, j.service_key, j.address) IN (
    ('Sarah Mitchell', 'gutter', '24 Maple Ridge Dr, Etobicoke ON'),
    ('James OBrien', 'downpipes', '88 King St W, Toronto ON'),
    ('Maria Santos', 'leaks-sealing', '15 Bloor St E, Mississauga ON'),
    ('David Chen', 'window-cleaning', '302 The Queensway, Toronto ON'),
    ('Linda Hayes', 'gutter', '77 Forest Manor Rd, North York ON'),
    ('Priya Patel', 'eavesdrop', '412 Yonge St, Toronto ON'),
    ('Tom Walsh', 'window-caulking', '55 Lakeshore Blvd W, Toronto ON'),
    ('Greenfield Properties', 'vent', '200 Front St W, Toronto ON'),
    ('Emily Tran', 'gutter', '9 Baby Point Rd, Toronto ON'),
    ('Michael OConnor', 'downpipes', '33 Avenue Rd, Toronto ON'),
    ('Jennifer Liu', 'leaks-sealing', '88 Ennerdale Rd, Markham ON'),
    ('Carlos Mendez', 'handyman', '17 Roncesvalles Ave, Toronto ON')
  );

  DELETE FROM csr_tickets
  WHERE job_id = ANY (v_job_ids)
     OR subject IN (
       'Invoice question — billing for vent cleaning',
       'Reschedule estimate appointment',
       'Follow-up call after gutter service — very happy',
       'Question about eavesdrop warranty coverage'
     );

  DELETE FROM invoices
  WHERE number IN (
    'INV-2026-001', 'INV-2026-002', 'INV-2026-003', 'INV-2026-004',
    'INV-2026-005', 'INV-2026-006', 'INV-2026-007', 'INV-2026-008'
  );

  DELETE FROM checklists WHERE job_id = ANY (v_job_ids);
  DELETE FROM job_photos WHERE job_id = ANY (v_job_ids);
  DELETE FROM jobs WHERE id = ANY (v_job_ids);

  DELETE FROM schedules
  WHERE (customer_name, service_key, address) IN (
    ('Greenfield Properties', 'vent', '200 Front St W, Toronto ON'),
    ('Riverside Condo Board', 'window-cleaning', '55 Lakeshore Blvd W, Toronto ON'),
    ('Sarah Mitchell', 'gutter', '24 Maple Ridge Dr, Etobicoke ON'),
    ('Maple Leaf Plaza', 'eavesdrop', '302 The Queensway, Toronto ON'),
    ('David Chen', 'window-cleaning', '302 The Queensway, Toronto ON')
  );

  DELETE FROM campaigns
  WHERE name IN (
    'Summer Gutter Cleanup Promo',
    'Fall Eavesdrop Maintenance Drive',
    'Window Cleaning New Customer Special',
    'Downpipe Repair Google Ads',
    'Handyman Holiday Package'
  );

  DELETE FROM customers
  WHERE phone LIKE '416-555-%'
     OR phone LIKE '905-555-%'
     OR phone LIKE '647-555-%';

  DELETE FROM technicians
  WHERE name IN ('Mike Thompson', 'Dave Park', 'Carlos Ramirez', 'Lisa Crowe')
    AND email IS DISTINCT FROM 'info@masblingastarservices.com';
END $;
