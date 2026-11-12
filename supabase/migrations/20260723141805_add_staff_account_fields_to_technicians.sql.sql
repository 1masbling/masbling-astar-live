/*
# Add staff account fields to technicians table

## Overview
Adds `auth_id` (uuid) and `email` (text) columns to the `technicians` table so each
crew member can be linked to a Supabase auth account.

## Modified Tables
- technicians: adds auth_id (uuid, nullable, FK to auth.users ON DELETE SET NULL)
  and email (text, nullable).

## Security
- No RLS policy changes. Both columns nullable. Index on auth_id.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'technicians' AND column_name = 'auth_id') THEN
    ALTER TABLE technicians ADD COLUMN auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'technicians' AND column_name = 'email') THEN
    ALTER TABLE technicians ADD COLUMN email text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_technicians_auth_id ON technicians(auth_id);