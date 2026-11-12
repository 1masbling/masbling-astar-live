-- F8: deletion requests hold the personal data of people who asked to be
-- forgotten. Restrict reads to staff instead of every authenticated account.

DROP POLICY IF EXISTS auth_select_data_deletion_requests ON public.data_deletion_requests;

CREATE POLICY auth_select_data_deletion_requests
  ON public.data_deletion_requests
  FOR SELECT
  TO authenticated
  USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'staff'::text));
