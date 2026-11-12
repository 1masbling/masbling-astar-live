/*
# Public project gallery

Plain-English summary: clients can now see completed before-and-after job photos on a public gallery page. Only jobs that the business has explicitly chosen to publish, and that have both a before and an after photo, are shown. No customer names, phone numbers or addresses are ever included.

1. Modified Tables
- `jobs`: new `gallery_published` flag, default off. A job only appears in the public gallery once this is switched on.

2. New Functions
- `public_job_gallery()`: returns one row per published, completed job that has both a before and an after photo. Each row contains the job id, the service name, the completion date, and the photo addresses for the most recent before and after photos.

3. Security
- The function runs with the owner's rights so visitors who are not signed in can read the gallery, but it only returns the columns listed above.
- Customer details, technician details, notes and pricing are never returned.
- EXECUTE is granted to the public web roles only, and only for this function.
- No table access is opened to visitors.

4. Important Notes
- Existing jobs stay hidden until they are published.
- The migration is safe to re-run.
*/

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gallery_published boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public_job_gallery()
RETURNS TABLE (
  job_id uuid,
  service_label text,
  completed_on date,
  before_url text,
  after_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH published AS (
    SELECT j.id, j.service_key, j.scheduled_date
    FROM jobs j
    WHERE j.status = 'complete' AND j.gallery_published
  ),
  latest AS (
    SELECT
      p.job_id,
      p.phase,
      p.photo_url,
      row_number() OVER (PARTITION BY p.job_id, p.phase ORDER BY p.created_at DESC) AS rn
    FROM job_photos p
    JOIN published pub ON pub.id = p.job_id
    WHERE p.phase IN ('before', 'after')
  )
  SELECT
    pub.id,
    coalesce(s.label, pub.service_key),
    pub.scheduled_date,
    (SELECT l.photo_url FROM latest l WHERE l.job_id = pub.id AND l.phase = 'before' AND l.rn = 1),
    (SELECT l.photo_url FROM latest l WHERE l.job_id = pub.id AND l.phase = 'after' AND l.rn = 1)
  FROM published pub
  LEFT JOIN services s ON s.key = pub.service_key
  WHERE EXISTS (SELECT 1 FROM latest l WHERE l.job_id = pub.id AND l.phase = 'before')
    AND EXISTS (SELECT 1 FROM latest l WHERE l.job_id = pub.id AND l.phase = 'after')
  ORDER BY pub.scheduled_date DESC NULLS LAST;
$$;

REVOKE EXECUTE ON FUNCTION public_job_gallery() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public_job_gallery() TO anon, authenticated;
