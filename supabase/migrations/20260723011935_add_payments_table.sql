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
