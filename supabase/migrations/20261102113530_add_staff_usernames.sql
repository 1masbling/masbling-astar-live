/*
# Add staff usernames for sign-in

1. Modified Tables
- `technicians`: new optional `username` text column. Usernames are unique across the roster, ignoring letter case.

2. New Functions
- `resolve_username_email(p_username)`: returns the sign-in email for an active roster member with that username, or null when there is no match.

3. Security
- The lookup function is SECURITY DEFINER with a fixed search_path so it can read the roster before anyone is signed in.
- EXECUTE is revoked from PUBLIC and granted only to anon and authenticated, because the sign-in form must call it before a session exists.
- It returns a single email column only; roster rows, roles and auth ids are never exposed.

4. Important Notes
- The column is nullable, so existing roster rows are unaffected.
- Only the email of an active member is ever returned.
*/

ALTER TABLE technicians ADD COLUMN IF NOT EXISTS username text;

CREATE UNIQUE INDEX IF NOT EXISTS technicians_username_lower_key
  ON technicians (lower(username))
  WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION resolve_username_email(p_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.email
  FROM technicians t
  WHERE lower(t.username) = lower(trim(p_username))
    AND t.active
    AND t.email IS NOT NULL
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION resolve_username_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_username_email(text) TO anon, authenticated;
