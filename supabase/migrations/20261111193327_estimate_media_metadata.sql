/*
# Store project photo/video metadata on estimates

1. Modified Tables
- `estimates`: adds `media_files` (jsonb, not null, defaults to an empty list).

2. What it holds
- One entry per file the customer attached in the estimate engine: file name, MIME type, size in bytes, and the file's last-modified timestamp.
- Only metadata is stored. The files themselves are not uploaded.

3. Security
- No change to row level security or grants. The column is written by the server-side estimate function only.

4. Notes
- Existing estimate rows get an empty list. Nothing is removed or changed.
*/

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS media_files jsonb NOT NULL DEFAULT '[]'::jsonb;
