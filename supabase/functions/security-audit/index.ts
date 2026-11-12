import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { requireAdmin } from "../_shared/require-staff.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Finding {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  table: string | null;
  category: string;
  title: string;
  description: string;
  recommendation: string;
  fixable: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // This endpoint reports the full access model and can run DDL, so both
    // branches require a real administrator session, not merely a project token
    // and not any staff account.
    const staffCheck = await requireAdmin(req, supabaseUrl, serviceRoleKey);
    if (!staffCheck.ok) {
      return new Response(
        JSON.stringify({ error: staffCheck.error }),
        { status: staffCheck.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (req.method === "GET") {
      const findings = await runAudit(supabase);
      return new Response(JSON.stringify({ findings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const { action } = await req.json();
      if (action === "fix_all") {
        const results = await applyFixes(supabase);
        return new Response(JSON.stringify({ results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("security-audit error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function runAudit(supabase: ReturnType<typeof createClient>): Promise<Finding[]> {
  const findings: Finding[] = [];

  // 1. Check RLS enabled on all public tables
  const { data: rlsData } = await supabase.rpc("check_rls_status");
  if (rlsData) {
    for (const row of rlsData) {
      if (!row.rls_enabled) {
        findings.push({
          id: `rls_disabled_${row.table_name}`,
          severity: "critical",
          table: row.table_name,
          category: "Row Level Security",
          title: `RLS not enabled on ${row.table_name}`,
          description: `The table ${row.table_name} has Row Level Security disabled. Any client with the anon key can read and modify all rows without restriction.`,
          recommendation: `Enable RLS: ALTER TABLE ${row.table_name} ENABLE ROW LEVEL SECURITY;`,
          fixable: true,
        });
      }
      if (row.rls_enabled && !row.rls_forced) {
        findings.push({
          id: `rls_not_forced_${row.table_name}`,
          severity: "medium",
          table: row.table_name,
          category: "Row Level Security",
          title: `RLS not forced on ${row.table_name}`,
          description: `RLS is enabled but not forced. Table owners (e.g., service role) bypass RLS policies, which can expose data if the service role key is compromised.`,
          recommendation: `Force RLS: ALTER TABLE ${row.table_name} FORCE ROW LEVEL SECURITY;`,
          fixable: true,
        });
      }
    }
  }

  // 2. Check for tables with RLS enabled but no policies
  const { data: policyData } = await supabase.rpc("check_policy_coverage");
  if (policyData) {
    for (const row of policyData) {
      if (row.policy_count === 0) {
        findings.push({
          id: `no_policies_${row.table_name}`,
          severity: "high",
          table: row.table_name,
          category: "RLS Policies",
          title: `No policies on ${row.table_name}`,
          description: `RLS is enabled but no policies exist. The table is completely locked down — no role (including anon) can read or write any rows.`,
          recommendation: `Add CRUD policies for anon and authenticated roles appropriate to the app's auth model.`,
          fixable: false,
        });
      }
      const missing: string[] = [];
      if (row.has_select === false) missing.push("SELECT");
      if (row.has_insert === false) missing.push("INSERT");
      if (row.has_update === false) missing.push("UPDATE");
      if (row.has_delete === false) missing.push("DELETE");
      if (missing.length > 0 && row.policy_count > 0) {
        findings.push({
          id: `missing_policies_${row.table_name}_${missing.join("_")}`,
          severity: "medium",
          table: row.table_name,
          category: "RLS Policies",
          title: `Missing ${missing.join(", ")} policies on ${row.table_name}`,
          description: `Table ${row.table_name} has ${row.policy_count} policies but is missing ${missing.join(", ")} policies. Operations without matching policies will be denied.`,
          recommendation: `Add the missing ${missing.join(", ")} policy/policies.`,
          fixable: false,
        });
      }
    }
  }

  // 3. Check for USING(true) permissive policies (overly permissive)
  const { data: permissiveData } = await supabase.rpc("check_permissive_policies");
  if (permissiveData) {
    const overPermissive = permissiveData.filter(
      (p: Record<string, unknown>) => p.qual === "true" || p.with_check === "true"
    );
    if (overPermissive.length > 0) {
      const tableGroups: Record<string, string[]> = {};
      for (const p of overPermissive) {
        const tbl = p.tablename as string;
        if (!tableGroups[tbl]) tableGroups[tbl] = [];
        tableGroups[tbl].push(p.cmd as string);
      }
      for (const [table, cmds] of Object.entries(tableGroups)) {
        findings.push({
          id: `over_permissive_${table}`,
          severity: "low",
          table,
          category: "Policy Permissions",
          title: `Overly permissive policies on ${table}`,
          description: `Table ${table} has USING(true) policies for ${cmds.join(", ")}. This is acceptable for single-tenant apps with no auth, but should use ownership checks if multi-user data isolation is needed.`,
          recommendation: `If this app adds user authentication, replace USING(true) with auth.uid() ownership checks.`,
          fixable: false,
        });
      }
    }
  }

  // 4. Check for missing indexes on FK columns
  const { data: fkData } = await supabase.rpc("check_fk_indexes");
  if (fkData) {
    for (const row of fkData) {
      if (!row.has_index) {
        findings.push({
          id: `missing_fk_index_${row.table_name}_${row.column_name}`,
          severity: "low",
          table: row.table_name,
          category: "Performance",
          title: `Missing index on FK ${row.table_name}.${row.column_name}`,
          description: `Foreign key column ${row.column_name} on ${row.table_name} has no index. Joins and cascade deletes will perform full table scans.`,
          recommendation: `CREATE INDEX idx_${row.table_name}_${row.column_name} ON ${row.table_name}(${row.column_name});`,
          fixable: true,
        });
      }
    }
  }

  // 5. Check for missing indexes on frequently filtered columns
  const { data: filterColData } = await supabase.rpc("check_filter_indexes");
  if (filterColData) {
    for (const row of filterColData) {
      if (!row.has_index) {
        findings.push({
          id: `missing_filter_index_${row.table_name}_${row.column_name}`,
          severity: "low",
          table: row.table_name,
          category: "Performance",
          title: `Missing index on ${row.table_name}.${row.column_name}`,
          description: `Column ${row.column_name} on ${row.table_name} is commonly used for filtering but has no index. Queries will perform full table scans.`,
          recommendation: `CREATE INDEX idx_${row.table_name}_${row.column_name} ON ${row.table_name}(${row.column_name});`,
          fixable: true,
        });
      }
    }
  }

  return findings.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });
}

async function applyFixes(supabase: ReturnType<typeof createClient>): Promise<{ applied: string[]; errors: string[] }> {
  const applied: string[] = [];
  const errors: string[] = [];

  // Fix 1: Force RLS on all public tables
  const { data: tables } = await supabase.rpc("check_rls_status");
  if (tables) {
    for (const row of tables) {
      if (row.rls_enabled && !row.rls_forced) {
        const { error } = await supabase.rpc("exec_sql", {
          sql_text: `ALTER TABLE public.${row.table_name} FORCE ROW LEVEL SECURITY;`,
        });
        if (error) errors.push(`Force RLS on ${row.table_name}: ${error.message}`);
        else applied.push(`Forced RLS on ${row.table_name}`);
      }
    }
  }

  // Fix 2: Create missing FK indexes
  const { data: fkData } = await supabase.rpc("check_fk_indexes");
  if (fkData) {
    for (const row of fkData) {
      if (!row.has_index) {
        const indexName = `idx_${row.table_name}_${row.column_name}`;
        const { error } = await supabase.rpc("exec_sql", {
          sql_text: `CREATE INDEX IF NOT EXISTS ${indexName} ON public.${row.table_name}(${row.column_name});`,
        });
        if (error) errors.push(`Index ${indexName}: ${error.message}`);
        else applied.push(`Created index ${indexName}`);
      }
    }
  }

  // Fix 3: Create missing filter indexes
  const { data: filterData } = await supabase.rpc("check_filter_indexes");
  if (filterData) {
    for (const row of filterData) {
      if (!row.has_index) {
        const indexName = `idx_${row.table_name}_${row.column_name}`;
        const { error } = await supabase.rpc("exec_sql", {
          sql_text: `CREATE INDEX IF NOT EXISTS ${indexName} ON public.${row.table_name}(${row.column_name});`,
        });
        if (error) errors.push(`Index ${indexName}: ${error.message}`);
        else applied.push(`Created index ${indexName}`);
      }
    }
  }

  return { applied, errors };
}
