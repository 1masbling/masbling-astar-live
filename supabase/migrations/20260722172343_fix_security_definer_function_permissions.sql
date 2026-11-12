/*
# Fix SECURITY DEFINER function execute permissions

## Summary
Revokes EXECUTE on all SECURITY DEFINER helper functions from the `anon` and `authenticated` roles.
These functions (check_rls_status, check_policy_coverage, check_permissive_policies,
check_fk_indexes, check_filter_indexes, exec_sql) are only used by the `security-audit`
edge function, which calls them with the service role key (which bypasses RLS and retains
EXECUTE privileges). Exposing them to anon/authenticated — especially `exec_sql`, which
runs arbitrary SQL — is a privilege escalation risk.

## Security Changes
1. REVOKE EXECUTE on all six helper functions FROM anon, authenticated.
   - The service role still has execute privileges, so the edge function continues to work.
   - `exec_sql` is the most critical: it runs arbitrary SQL as SECURITY DEFINER. Even though
     it filters to CREATE INDEX / ALTER TABLE FORCE RLS, that regex filter is bypassable.
     Revoking public execute eliminates the attack surface entirely.

## Important Notes
1. The security-audit edge function uses the service role key, which is unaffected by this
   revoke — it continues to call all helper functions normally.
2. No application code changes required — the frontend never calls these functions directly
   via RPC; only the edge function does, server-side.
*/

REVOKE EXECUTE ON FUNCTION public.check_filter_indexes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_fk_indexes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_permissive_policies() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_policy_coverage() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rls_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.exec_sql(sql_text text) FROM anon, authenticated;
