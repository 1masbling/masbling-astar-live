/*
  # Per-address rate limit log for public forms

  The estimate form had rate-limit constants declared but never applied, and the
  booking form limited only by phone number, so either one could be driven in a
  loop to send unlimited mail from our domain to a chosen address.

  1. New table
     - `public.form_submission_log` (`id`, `kind`, `identifier`, `created_at`)
       `identifier` is a lowercased email or phone.
  2. Security
     - RLS enabled with NO policies, so the anon and authenticated roles can never
       read or write it. Only the service role (the edge functions) touches it.
*/

CREATE TABLE IF NOT EXISTS public.form_submission_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  identifier text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.form_submission_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.form_submission_log FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS form_submission_log_lookup_idx
  ON public.form_submission_log (kind, identifier, created_at DESC);
