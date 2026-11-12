/*
  # Narrow the anonymous role's table privileges

  Every table carried full CRUD grants for the `anon` role. Row level security
  still denied those calls because no table has an anon policy, but the grants are
  a standing hazard: any future policy added without a role list would immediately
  be reachable from the public internet.

  1. Changes
     - Revoke all privileges on every public table from `anon`
     - Re-grant SELECT only on the tables the public marketing site actually reads
       (services and the website content tables), which already have public read
       policies
  2. Notes
     - `authenticated` is untouched: its access is gated by the policies.
     - Edge functions use the service role and are unaffected.
*/

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;

GRANT SELECT ON public.services TO anon;
GRANT SELECT ON public.website_faqs TO anon;
GRANT SELECT ON public.website_gallery TO anon;
GRANT SELECT ON public.website_service_areas TO anon;
GRANT SELECT ON public.website_testimonials TO anon;
