/*
# Add service_label to job_photos and photo report column to invoices

1. Modified Tables
- `job_photos`: add `service_label` text, nullable. Stores which of the 8
  website-catalog services (Gutter Cleaning, Leak Sealing, Reattachment
  Services, Window Caulking, Window Cleaning, Vent Replacement, Heated
  Wire/Cable Installation, Christmas Lights Installation & Removal) the
  photo/video belongs to. Nullable so existing rows keep working.
- `invoices`: add `photo_report` jsonb, nullable. Stores the admin-selected
  Job Site Photo Report attachment: an array of entries
  `{ url, caption, kind }` (2-6 items) rendered on the invoice/quote PDF.
  Nullable so invoices without a report are unaffected.
2. Security
- No RLS or grant changes: both columns are covered by the tables' existing
  staff-scoped policies and grants.
3. Notes
- Idempotent: uses conditional DO blocks so it is safe to re-run.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'job_photos'
      AND column_name = 'service_label'
  ) THEN
    ALTER TABLE job_photos ADD COLUMN service_label text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name = 'photo_report'
  ) THEN
    ALTER TABLE invoices ADD COLUMN photo_report jsonb;
  END IF;
END $$;
