// Shared per-identifier rate limiting for the public (unauthenticated) forms.
//
// These endpoints send mail through Resend on every successful call, so without a
// limit keyed on the recipient address they can be driven in a loop to deliver
// unlimited mail from our domain to a chosen victim. Counting is done in a table
// the browser cannot read or write (RLS on, no policies, service role only).

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

export interface RateLimitResult {
  allowed: boolean;
  error?: string;
}

export async function checkAndRecord(
  supabaseUrl: string,
  serviceRoleKey: string,
  kind: string,
  identifier: string,
  maxPerHour: number,
  maxPerDay: number,
): Promise<RateLimitResult> {
  const key = String(identifier || "").trim().toLowerCase();
  if (!key) return { allowed: true };

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count: hourly } = await db
    .from("form_submission_log")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .eq("identifier", key)
    .gte("created_at", hourAgo);

  if (hourly !== null && hourly >= maxPerHour) {
    return { allowed: false, error: "Too many submissions. Please try again later." };
  }

  const { count: daily } = await db
    .from("form_submission_log")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .eq("identifier", key)
    .gte("created_at", dayAgo);

  if (daily !== null && daily >= maxPerDay) {
    return { allowed: false, error: "Daily submission limit reached. Please call our office." };
  }

  await db.from("form_submission_log").insert({ kind, identifier: key });

  return { allowed: true };
}
