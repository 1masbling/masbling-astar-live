/*
# Job site photo storage and before/after labels

Plain-English summary: job site photos now have a permanent home in a dedicated storage bucket, and each photo can be labelled as a "before" or "after" shot of the job.

1. New Storage
- Bucket `job-photos`: holds watermarked job site photos. It is public for reading so photos can be shown on the website and in the staff gallery, and it accepts only JPEG, PNG and WebP images up to 10 MB.
- Files are stored in a folder named after the job, for example `<job id>/<random name>.jpg`.

2. Modified Tables
- `job_photos`: new optional `phase` column with the values `before` or `after`. Existing rows keep an empty phase until someone labels them.
- New index on `job_photos (job_id)` so each job's photos load quickly.

3. Security
- Uploads into `job-photos` are allowed only for the master admin, or for a staff member who is assigned to the job whose folder is being written to.
- Only the master admin can delete stored photo files.
- No listing of the bucket is allowed for visitors. Anyone with a photo's direct link can view that photo, which is the intended behaviour for before-and-after showcase images.
- The existing `job_photos` row policies are unchanged: staff may add photos only to their own assigned jobs, and only the master admin may edit or delete photo records.

4. Important Notes
- Photos must be watermarked in the browser before upload; this migration does not process images.
- The migration is safe to re-run: it creates only what is missing and replaces its own storage policies.
*/

ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS phase text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_photos_phase_check' AND conrelid = 'job_photos'::regclass
  ) THEN
    ALTER TABLE job_photos ADD CONSTRAINT job_photos_phase_check CHECK (phase IN ('before', 'after'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS job_photos_job_id_idx ON job_photos (job_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-photos',
  'job-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "staff_upload_job_photo_files" ON storage.objects;
CREATE POLICY "staff_upload_job_photo_files" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'job-photos'
    AND (
      is_admin()
      OR (
        is_staff()
        AND EXISTS (
          SELECT 1
          FROM jobs j
          WHERE j.id::text = (storage.foldername(name))[1]
            AND j.technician_id = my_tech_id()
        )
      )
    )
  );

DROP POLICY IF EXISTS "admin_delete_job_photo_files" ON storage.objects;
CREATE POLICY "admin_delete_job_photo_files" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'job-photos' AND is_admin());
