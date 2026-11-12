/*
  # Separate administrators from field workers

  Until now every staff account carried the same `app_metadata.role = 'staff'`
  claim, and every table policy accepted that claim, so a field technician had
  the same read and write reach as the owner. The worker/administrator split
  existed only in the React router.

  1. Helper functions
     - `is_staff()`    - the session carries the staff claim (service-role set).
     - `is_admin()`    - staff AND the roster holds an active `master-admin` row
                         matching this session (by auth id, or by the provider
                         verified email). Roster writes are admin-only below, so
                         the tier cannot be self-granted.
     - `my_tech_id()`  - the caller's own roster row id, for worker scoping.
     All are SECURITY DEFINER so they can read `technicians` without recursing
     through that table's own policies.

  2. Policy model
     - Administrative tables (billing, customers, settings, marketing, privacy
       requests, roster writes): admin only.
     - Worker tables: a technician reaches only their own jobs, the checklists
       of those jobs, and their own time entries.
     - Public website content keeps its anonymous read policies untouched.

  3. Notes
     - No data is dropped or altered; only policies change.
     - A denied SELECT returns an empty set rather than an error, so the
       dashboard degrades cleanly for a worker session.
*/

-- 1. Helpers -----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(((auth.jwt() -> 'app_metadata') ->> 'role') = 'staff', false);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(((auth.jwt() -> 'app_metadata') ->> 'role') = 'staff', false)
     AND EXISTS (
       SELECT 1
       FROM public.technicians t
       WHERE t.active
         AND t.role = 'master-admin'
         AND (
           t.auth_id = auth.uid()
           OR (t.email IS NOT NULL AND lower(t.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
         )
     );
$$;

CREATE OR REPLACE FUNCTION public.my_tech_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id
  FROM public.technicians t
  WHERE t.active
    AND (
      t.auth_id = auth.uid()
      OR (t.email IS NOT NULL AND lower(t.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    )
  ORDER BY (t.auth_id = auth.uid()) DESC NULLS LAST
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_tech_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_tech_id() TO authenticated;

-- 2. Clear the flat staff policies on every table we are re-keying ------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'customers','invoices','payments','estimates','estimate_line_items',
        'campaigns','csr_tickets','review_requests','notifications',
        'data_deletion_requests','company_settings','schedules','technicians',
        'jobs','job_photos','checklists','time_entries','services',
        'website_faqs','website_gallery','website_service_areas','website_testimonials'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 3. Administrative tables: admin only ----------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customers','invoices','payments','estimates','estimate_line_items',
    'campaigns','csr_tickets','review_requests','data_deletion_requests',
    'company_settings','schedules'
  ]
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_admin())', 'admin_select_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())', 'admin_insert_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', 'admin_update_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', 'admin_delete_' || t, t);
  END LOOP;
END $$;

-- 4. Public website content: anonymous read, admin write ----------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'services','website_faqs','website_gallery','website_service_areas','website_testimonials'
  ]
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)', 'public_select_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())', 'admin_insert_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', 'admin_update_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', 'admin_delete_' || t, t);
  END LOOP;
END $$;

-- 5. Roster: every staff member may read it, only an admin may change it ------

CREATE POLICY "staff_select_technicians" ON public.technicians
  FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "admin_insert_technicians" ON public.technicians
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin_update_technicians" ON public.technicians
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_technicians" ON public.technicians
  FOR DELETE TO authenticated USING (public.is_admin());

-- 6. Jobs: an admin sees all, a worker sees only their own assignments --------

CREATE POLICY "select_jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (public.is_admin() OR (public.is_staff() AND technician_id = public.my_tech_id()));
CREATE POLICY "admin_insert_jobs" ON public.jobs
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "update_jobs" ON public.jobs
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (public.is_staff() AND technician_id = public.my_tech_id()))
  WITH CHECK (public.is_admin() OR (public.is_staff() AND technician_id = public.my_tech_id()));
CREATE POLICY "admin_delete_jobs" ON public.jobs
  FOR DELETE TO authenticated USING (public.is_admin());

-- 7. Checklists: scoped to the job they belong to -----------------------------

CREATE POLICY "select_checklists" ON public.checklists
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.is_staff() AND EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.id = checklists.job_id AND j.technician_id = public.my_tech_id()
    ))
  );
CREATE POLICY "admin_insert_checklists" ON public.checklists
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "update_checklists" ON public.checklists
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (public.is_staff() AND EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.id = checklists.job_id AND j.technician_id = public.my_tech_id()
    ))
  )
  WITH CHECK (
    public.is_admin()
    OR (public.is_staff() AND EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.id = checklists.job_id AND j.technician_id = public.my_tech_id()
    ))
  );
CREATE POLICY "admin_delete_checklists" ON public.checklists
  FOR DELETE TO authenticated USING (public.is_admin());

-- 8. Time entries: a worker may only clock their own time ---------------------

CREATE POLICY "select_time_entries" ON public.time_entries
  FOR SELECT TO authenticated
  USING (public.is_admin() OR (public.is_staff() AND technician_id = public.my_tech_id()));
CREATE POLICY "insert_time_entries" ON public.time_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (public.is_staff() AND technician_id = public.my_tech_id()));
CREATE POLICY "update_time_entries" ON public.time_entries
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (public.is_staff() AND technician_id = public.my_tech_id()))
  WITH CHECK (public.is_admin() OR (public.is_staff() AND technician_id = public.my_tech_id()));
CREATE POLICY "admin_delete_time_entries" ON public.time_entries
  FOR DELETE TO authenticated USING (public.is_admin());

-- 9. Job photos: scoped to the job ---------------------------------------------

CREATE POLICY "select_job_photos" ON public.job_photos
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.is_staff() AND EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.id = job_photos.job_id AND j.technician_id = public.my_tech_id()
    ))
  );
CREATE POLICY "insert_job_photos" ON public.job_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (public.is_staff() AND EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.id = job_photos.job_id AND j.technician_id = public.my_tech_id()
    ))
  );
CREATE POLICY "admin_update_job_photos" ON public.job_photos
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_job_photos" ON public.job_photos
  FOR DELETE TO authenticated USING (public.is_admin());

-- 10. Notifications: the field app logs them, only an admin reads them --------

CREATE POLICY "admin_select_notifications" ON public.notifications
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "staff_insert_notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "admin_update_notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_notifications" ON public.notifications
  FOR DELETE TO authenticated USING (public.is_admin());
