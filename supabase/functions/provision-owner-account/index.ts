import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { checkAndRecord } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_PER_HOUR = 5;
const MAX_PER_DAY = 10;
const PAGE_SIZE = 200;
const MAX_PAGES = 20;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < PAGE_SIZE) return null;
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { email: rawEmail } = await req.json();
    const email = String(rawEmail || "").trim().toLowerCase();
    if (!email) {
      return json({ error: "Enter the owner email address." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const limit = await checkAndRecord(
      supabaseUrl,
      serviceRoleKey,
      "owner-provision",
      email,
      MAX_PER_HOUR,
      MAX_PER_DAY,
    );
    if (!limit.allowed) {
      return json({ error: limit.error }, 429);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: owner, error: ownerError } = await admin
      .from("technicians")
      .select("id, email, auth_id")
      .eq("role", "master-admin")
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (ownerError) throw ownerError;

    const ownerEmail = owner?.email?.toLowerCase().trim();
    if (!owner || !ownerEmail || email !== ownerEmail) {
      return json({ ok: true }, 200);
    }

    const existing = await findAuthUserByEmail(admin, ownerEmail);
    let authId: string;

    if (existing) {
      authId = existing.id;
      if (existing.app_metadata?.role !== "staff") {
        const { error } = await admin.auth.admin.updateUserById(authId, {
          app_metadata: { ...existing.app_metadata, role: "staff" },
        });
        if (error) throw error;
      }
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: ownerEmail,
        password: `${crypto.randomUUID()}${crypto.randomUUID()}`,
        email_confirm: true,
        app_metadata: { role: "staff" },
      });
      if (error) throw error;
      authId = data.user.id;
    }

    if (!owner.auth_id) {
      const { error } = await admin
        .from("technicians")
        .update({ auth_id: authId })
        .eq("id", owner.id);
      if (error) throw error;
    }

    return json({ ok: true }, 200);
  } catch (err) {
    console.error("provision-owner-account error:", err);
    return json({ error: "We could not set up the owner account. Please try again." }, 500);
  }
});
