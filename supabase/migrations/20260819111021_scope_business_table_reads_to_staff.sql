-- F1: business tables must not be readable by every signed-in account.
-- Replace USING (true) on SELECT with the same staff predicate the write policies use.
-- services and website_* keep public read: the marketing site reads them unauthenticated.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'customers','jobs','invoices','payments','estimates','estimate_line_items',
    'technicians','notifications','time_entries','schedules','checklists',
    'job_photos','csr_tickets','campaigns','review_requests','company_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_select_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text) = ''staff''::text))',
      'auth_select_' || t, t
    );
  END LOOP;
END $$;
