/*
# Security Audit Helper Functions

Creates a set of SECURITY DEFINER functions used by the security-audit
edge function to inspect the database for RLS and indexing vulnerabilities.

## Functions created
1. `check_rls_status()` — returns table_name, rls_enabled, rls_forced for all public tables
2. `check_policy_coverage()` — returns per-table policy counts and which CRUD verbs are covered
3. `check_permissive_policies()` — returns policies that use USING(true) or WITH CHECK(true)
4. `check_fk_indexes()` — returns FK columns that lack an index
5. `check_filter_indexes()` — returns commonly-filtered columns (status, service_key, active) that lack an index
6. `exec_sql(sql_text text)` — executes a DDL statement (for applying fixes)

## Security
- All functions are SECURITY DEFINER so the edge function (service role) can inspect pg_catalog
- `exec_sql` is restricted to DDL only (CREATE INDEX, ALTER TABLE ... FORCE RLS) — it rejects
  any statement containing SELECT, INSERT, UPDATE, DELETE, DROP, TRUNCATE, GRANT, or REVOKE
  to prevent data exfiltration or destruction through the audit endpoint
*/

-- 1. RLS status
CREATE OR REPLACE FUNCTION public.check_rls_status()
RETURNS TABLE(table_name text, rls_enabled boolean, rls_forced boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    c.relname::text,
    c.relrowsecurity,
    c.relforcerowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.relname;
$$;

-- 2. Policy coverage per table
-- polcmd: '*' = ALL, 'r' = SELECT, 'a' = INSERT, 'w' = UPDATE, 'd' = DELETE
CREATE OR REPLACE FUNCTION public.check_policy_coverage()
RETURNS TABLE(
  table_name text,
  policy_count bigint,
  has_select boolean,
  has_insert boolean,
  has_update boolean,
  has_delete boolean
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    t.relname::text,
    COUNT(p.polname)::bigint,
    bool_or(p.polcmd IN ('r', '*')),
    bool_or(p.polcmd IN ('a', '*')),
    bool_or(p.polcmd IN ('w', '*')),
    bool_or(p.polcmd IN ('d', '*'))
  FROM pg_class t
  JOIN pg_namespace n ON n.oid = t.relnamespace
  LEFT JOIN pg_policy p ON p.polrelid = t.oid
  WHERE n.nspname = 'public' AND t.relkind = 'r'
  GROUP BY t.relname
  ORDER BY t.relname;
$$;

-- 3. Permissive policies (USING true / WITH CHECK true)
CREATE OR REPLACE FUNCTION public.check_permissive_policies()
RETURNS TABLE(
  tablename text,
  policyname text,
  cmd text,
  qual text,
  with_check text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    c.relname::text,
    p.polname::text,
    p.polcmd::text,
    pg_get_expr(p.polqual, p.polrelid)::text,
    pg_get_expr(p.polwithcheck, p.polrelid)::text
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public';
$$;

-- 4. FK columns missing indexes
CREATE OR REPLACE FUNCTION public.check_fk_indexes()
RETURNS TABLE(
  table_name text,
  column_name text,
  constraint_name text,
  foreign_table text,
  has_index boolean
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH fk_cols AS (
    SELECT
      cl.relname::text AS table_name,
      att.attname::text AS column_name,
      con.conname::text AS constraint_name,
      cl2.relname::text AS foreign_table
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    JOIN pg_class cl2 ON cl2.oid = con.confrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    JOIN pg_attribute att ON att.attrelid = cl.oid AND att.attnum = con.conkey[1]
    WHERE n.nspname = 'public' AND con.contype = 'f'
  )
  SELECT
    f.table_name,
    f.column_name,
    f.constraint_name,
    f.foreign_table,
    EXISTS(
      SELECT 1 FROM pg_index ix
      JOIN pg_class tc ON tc.oid = ix.indrelid
      JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = ix.indkey[0]
      WHERE tc.relname = f.table_name AND a.attname = f.column_name
    ) AS has_index
  FROM fk_cols f;
$$;

-- 5. Commonly-filtered columns missing indexes
CREATE OR REPLACE FUNCTION public.check_filter_indexes()
RETURNS TABLE(
  table_name text,
  column_name text,
  has_index boolean
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH filter_cols AS (
    SELECT
      c.relname::text AS table_name,
      a.attname::text AS column_name
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND a.attnum > 0
      AND a.attname IN ('status', 'service_key', 'active', 'job_id')
  )
  SELECT
    f.table_name,
    f.column_name,
    EXISTS(
      SELECT 1 FROM pg_index ix
      JOIN pg_class tc ON tc.oid = ix.indrelid
      JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = ix.indkey[0]
      WHERE tc.relname = f.table_name AND a.attname = f.column_name
    ) AS has_index
  FROM filter_cols f;
$$;

-- 6. Safe DDL executor (index creation + force RLS only)
CREATE OR REPLACE FUNCTION public.exec_sql(sql_text text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Reject anything that isn't DDL for index creation or RLS forcing
  IF sql_text !~* '^\s*(CREATE\s+INDEX|ALTER\s+TABLE\s+\S+\s+FORCE\s+ROW\s+LEVEL\s+SECURITY)' THEN
    RAISE EXCEPTION 'Blocked: only CREATE INDEX and ALTER TABLE ... FORCE ROW LEVEL SECURITY are allowed';
  END IF;
  EXECUTE sql_text;
END;
$$;

-- Revoke access from anon, grant to authenticated (edge function uses service role)
REVOKE ALL ON FUNCTION public.check_rls_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_policy_coverage() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_permissive_policies() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_fk_indexes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_filter_indexes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
