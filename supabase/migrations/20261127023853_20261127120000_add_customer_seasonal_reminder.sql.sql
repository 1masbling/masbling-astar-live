/*
# Add seasonal reminder flag to customers

1. Modified Tables
- `customers`
  - `seasonal_reminder` (boolean, nullable, defaults to false)
    - Admin-only flag: when true, the customer profile shows the
      "Seasonal Reminder (Spring/Fall Cleanout)" badge so the operator
      remembers to send a seasonal gutter/exterior check-in message.

2. Security
- No RLS changes. The `customers` table already has staff-scoped RLS
  policies (SELECT/INSERT/UPDATE/DELETE for authenticated staff), and
  authenticated staff write this column through the same policies.
- No new grants needed: the existing table-level privileges on
  `customers` for `authenticated` cover the new column.

3. Notes
- Idempotent: uses a guarded DO block so re-running is safe.
- Nullable with a false default so existing rows read as "no reminder".
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customers'
      AND column_name = 'seasonal_reminder'
  ) THEN
    ALTER TABLE public.customers
      ADD COLUMN seasonal_reminder boolean DEFAULT false;
  END IF;
END $$;
