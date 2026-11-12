import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { checkAndRecord } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_NAME_LEN = 120;
const MAX_PHONE_LEN = 30;
const PHONE_REGEX = /^[\d\s\-\(\)\+]{7,}$/;
const MAX_PER_HOUR = 3;
const MAX_PER_DAY = 6;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const genericReply = () =>
  new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { name, phone } = await req.json();
    const trimmedName = String(name || "").trim().slice(0, MAX_NAME_LEN);
    const trimmedPhone = String(phone || "").trim().slice(0, MAX_PHONE_LEN);

    if (trimmedName.length < 2) {
      return new Response(JSON.stringify({ error: "Please enter your full name." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!PHONE_REGEX.test(trimmedPhone)) {
      return new Response(JSON.stringify({ error: "Please enter a valid phone number." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const limit = await checkAndRecord(
      supabaseUrl,
      serviceRoleKey,
      "account-recovery",
      trimmedPhone,
      MAX_PER_HOUR,
      MAX_PER_DAY,
    );
    if (!limit.allowed) {
      return new Response(JSON.stringify({ error: limit.error }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const ownerEmail = Deno.env.get("OWNER_EMAIL") || "info@masblingastarservices.com";
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not set — account recovery request not forwarded");
      return genericReply();
    }

    const eName = escapeHtml(trimmedName);
    const ePhone = escapeHtml(trimmedPhone);
    const html = `
<div style="font-family:Arial,sans-serif;font-size:14px;color:#1e293b;">
  <p style="margin:0 0 12px;"><strong>A staff member requested help recovering their sign-in email.</strong></p>
  <p style="margin:0 0 4px;">Name: ${eName}</p>
  <p style="margin:0 0 12px;">Phone: ${ePhone}</p>
  <p style="margin:0;color:#64748b;">Confirm their identity, then reply with the correct sign-in email. Nothing was changed in the system.</p>
</div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Masbling Astar Services <info@masblingastarservices.com>",
        to: [ownerEmail],
        subject: `Sign-in email recovery request: ${trimmedName.slice(0, 80)}`.replace(/[\r\n]/g, " "),
        html,
      }),
    });

    if (!res.ok) {
      console.error("Account recovery email failed:", res.status, await res.text().catch(() => ""));
    }

    return genericReply();
  } catch (err) {
    console.error("account-recovery-request error:", err);
    return new Response(
      JSON.stringify({ error: "We could not process your request. Please call us instead." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
