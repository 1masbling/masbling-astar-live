/*
# Add staff account fields to technicians table

## Overview
Adds `auth_id` (uuid) and `email` (text) columns to the `technicians` table so each
crew member can be linked to a Supabase auth account. This enables the staff account
creation flow: an admin creates a technician record AND a matching auth user account
(via the create-staff edge function), and the technician can then sign in with their
email and password to access the Field App.

## Modified Tables
- technicians: adds `auth_id` (uuid, nullable, references auth.users on delete set null)
  and `email` (text, nullable, used for display and lookup when auth_id is not yet set).

## Security
- No RLS policy changes needed — existing anon/authenticated CRUD policies remain.
- The `auth_id` column is nullable so existing technician rows continue to work.
- Index added on `auth_id` for quick lookup of the technician associated with a signed-in user.

## Important Notes
1. Both columns are nullable so existing rows and app code continue to work.
2. The edge function (create-staff) uses the service role key to create the auth user
   and then inserts/updates the technician record with the new auth_id + email.
3. Staff sign in through the existing sign-in screen; their session is checked against
   the technicians table to determine if they have field-app access.
*/