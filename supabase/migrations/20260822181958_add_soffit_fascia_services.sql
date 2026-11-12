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
