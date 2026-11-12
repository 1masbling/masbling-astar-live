import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkAndRecord } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_PER_HOUR = 5;
const MAX_PER_DAY = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_SENT = { ok: true };

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseAppOrigin(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { email: rawEmail, appOrigin: rawOrigin } = await req.json();
    const email = String(rawEmail || "").trim().toLowerCase();
    const origin = parseAppOrigin(rawOrigin);

    if (!EMAIL_REGEX.test(email) || email.length > 254) {
      return json({ error: "Enter a valid email address." }, 400);
    }
    if (!origin) {
      return json({ error: "The app address could not be read. Please reload and try again." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const limit = await checkAndRecord(
      supabaseUrl,
      serviceRoleKey,
      "password-reset",
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

    const resetPath = `${origin}/reset-password`;
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: resetPath },
    });

    if (error || !data?.properties?.hashed_token || !data.properties.action_link) {
      if (error) console.error("send-password-reset generateLink:", error.message);
      return json(GENERIC_SENT, 200);
    }

    const returnedTarget = new URL(data.properties.action_link).searchParams.get("redirect_to");
    if (!returnedTarget || new URL(returnedTarget).href !== new URL(resetPath).href) {
      console.error("send-password-reset: origin not in Supabase redirect allowlist:", origin);
      return json(
        { error: "This site address is not allowed for password emails yet. Ask your administrator to add it to the redirect URLs." },
        400,
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not set; password reset email not sent");
      return json({ error: "Email delivery is not configured yet. Please contact your administrator." }, 503);
    }

    const link = `${resetPath}?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery`;
    const safeLink = escapeHtml(link);
    const html = `
<div style="font-family:Arial,sans-serif;font-size:14px;color:#1e293b;">
  <p style="margin:0 0 12px;"><strong>Reset your Masbling Astar Services password</strong></p>
  <p style="margin:0 0 16px;">Select the button below to choose a new password. The link can be used once and expires shortly.</p>
  <p style="margin:0 0 16px;"><a href="${safeLink}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;">Choose a new password</a></p>
  <p style="margin:0;color:#64748b;">If you did not ask for this, you can ignore this email. Your password will not change.</p>
</div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Masbling Astar Services <info@masblingastarservices.com>",
        to: [email],
        subject: "Reset your Masbling Astar Services password",
        html,
      }),
    });

    if (!res.ok) {
      console.error("Password reset email failed:", res.status, await res.text().catch(() => ""));
      return json({ error: "We could not send the email. Please try again in a few minutes." }, 502);
    }

    return json(GENERIC_SENT, 200);
  } catch (err) {
    console.error("send-password-reset error:", err);
    return json({ error: "We could not send the reset email. Please try again." }, 500);
  }
});
