/*
# Calculator quote uploads: private bucket and quote table

1. New Storage
- Private bucket `calculator-uploads` for photos and videos attached in the homepage price calculator.
- Limits: 100 MB per file; only JPEG, PNG, MP4 and QuickTime (MOV) types.

2. New Tables
- `calculator_quotes`: one row per calculator submission with the selected services (jsonb), subtotal, 13% HST amount, total, and the list of uploaded file paths with their name, type and size.

3. Security
- Bucket is not public. Anonymous visitors may only INSERT objects into `calculator-uploads`; they cannot read, update or delete them.
- `calculator_quotes` has RLS enabled and no anon or authenticated policies. Only the service role (used by the submit edge function) can read or write it.

4. Notes
- Nothing existing is modified or removed.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'calculator-uploads',
  'calculator-uploads',
  false,
  104857600,
  ARRAY['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "anon_upload_calculator_files" ON storage.objects;
CREATE POLICY "anon_upload_calculator_files" ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'calculator-uploads');

CREATE TABLE IF NOT EXISTS calculator_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  services jsonb NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  hst_amount numeric(10,2) NOT NULL,
  total numeric(10,2) NOT NULL,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE calculator_quotes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON calculator_quotes TO service_role;
