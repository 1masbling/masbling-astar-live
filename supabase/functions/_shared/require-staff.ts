// Shared caller authorization for privileged edge functions.
//
// The platform's verify_jwt flag only proves a bearer token was signed by this
// project's JWT secret. The public anon key is exactly such a token and ships in
// every browser bundle, so verify_jwt alone does NOT establish that the caller is
// staff. This resolves the token to a real user and checks the staff role that
// only the service role can set (app_metadata, not the user-editable metadata).

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

export interface StaffCheckResult {
  ok: boolean;
  status: number;
  error?: string;
  userId?: string;
}

// Provisioning accounts and running schema changes are owner capabilities, and
// every field technician also carries the "staff" claim, so these endpoints need
// the stricter tier. Administrator status is the same rule the database's
// is_admin() uses: an active roster row marked master-admin that matches this
// session, checked server-side with the service role. The caller cannot edit
// that row, because roster writes are themselves admin-only.
export async function requireAdmin(
  req: Request,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<StaffCheckResult> {
  const staffCheck = await requireStaff(req, supabaseUrl, serviceRoleKey);
  if (!staffCheck.ok) return staffCheck;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: user } = await admin.auth.admin.getUserById(staffCheck.userId!);
  const email = (user?.user?.email || "").toLowerCase();

  const { data: rows, error } = await admin
    .from("technicians")
    .select("id, role, active, auth_id, email")
    .eq("active", true)
    .eq("role", "master-admin");

  if (error) {
    console.error("requireAdmin roster lookup failed:", error.message);
    return { ok: false, status: 500, error: "Could not verify your access." };
  }

  const isAdmin = (rows || []).some(
    (r) =>
      r.auth_id === staffCheck.userId ||
      (!!r.email && String(r.email).toLowerCase() === email && email.length > 0),
  );

  if (!isAdmin) {
    return { ok: false, status: 403, error: "Not authorized" };
  }

  return staffCheck;
}

export async function requireStaff(
  req: Request,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<StaffCheckResult> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // The anon key is a valid project JWT but resolves to no user, so this call
  // is what separates "a token from this project" from "a signed-in person".
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const appMetadata = (data.user.app_metadata || {}) as Record<string, unknown>;
  if (appMetadata.role !== "staff") {
    return { ok: false, status: 403, error: "Not authorized" };
  }

  return { ok: true, status: 200, userId: data.user.id };
}
