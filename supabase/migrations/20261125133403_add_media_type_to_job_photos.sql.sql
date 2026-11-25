/*
# Add media_type to job_photos (photo vs video)

1. Modified Tables
- `job_photos`: add `media_type` text column, NOT NULL with default 'photo'.
  - Allowed values are enforced by a CHECK constraint: 'photo' or 'video'.
  - Existing rows keep working: they all default to 'photo'.
2. Security
- No RLS or grant changes: the column is covered by the table's existing
  staff-scoped policies and grants.
3. Notes
- Idempotent: uses a conditional DO block so it is safe to re-run.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'job_photos'
      AND column_name = 'media_type'
  ) THEN
    ALTER TABLE job_photos
      ADD COLUMN media_type text NOT NULL DEFAULT 'photo'
      CONSTRAINT job_photos_media_type_check CHECK (media_type IN ('photo', 'video'));
  END IF;
END $$;
