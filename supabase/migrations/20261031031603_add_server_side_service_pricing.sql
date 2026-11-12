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
