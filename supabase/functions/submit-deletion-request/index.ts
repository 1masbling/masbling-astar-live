import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { verifyCaptchaToken } from "../_shared/captcha.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_NAME_LEN = 200;
const MAX_EMAIL_LEN = 320;
const MAX_PHONE_LEN = 50;
const MAX_ACCOUNT_LEN = 200;
const MAX_REASON_LEN = 2000;
const MAX_SUBMISSIONS_PER_HOUR = 3;
const MAX_SUBMISSIONS_PER_DAY = 10;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /https?:\/\/|www\./i;
const SPAM_KEYWORDS = /\b(viagra|casino|seo|backlink|crypto|betting|gambling|loan|casino)\b/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      account_identifier,
      reason,
      honeypot,
      captchaToken,
      captchaAnswer,
    } = body;

    // Honeypot: if filled, silently succeed (bot caught)
    if (honeypot) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate required fields
    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: "Name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const trimmedName = String(name).trim().slice(0, MAX_NAME_LEN);
    const trimmedEmail = String(email).trim().toLowerCase().slice(0, MAX_EMAIL_LEN);
    const trimmedPhone = phone ? String(phone).trim().slice(0, MAX_PHONE_LEN) : null;
    const trimmedAccount = account_identifier ? String(account_identifier).trim().slice(0, MAX_ACCOUNT_LEN) : null;
    const trimmedReason = reason ? String(reason).trim().slice(0, MAX_REASON_LEN) : null;

    if (trimmedName.length < 2) {
      return new Response(JSON.stringify({ error: "Name is too short" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Spam detection
    const allText = `${trimmedName} ${trimmedEmail} ${trimmedPhone || ""} ${trimmedAccount || ""} ${trimmedReason || ""}`;
    if (URL_REGEX.test(allText) || SPAM_KEYWORDS.test(allText)) {
      return new Response(JSON.stringify({ error: "Submission flagged as spam" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify signed CAPTCHA token
    const captchaResult = await verifyCaptchaToken(
      captchaToken || "",
      captchaAnswer || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      Deno.env.get("SUPABASE_URL")!,
    );
    if (!captchaResult.valid) {
      return new Response(JSON.stringify({ error: captchaResult.error }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Rate limiting: check recent submissions by email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: hourlyCount } = await supabase
      .from("data_deletion_requests")
      .select("id", { count: "exact", head: true })
      .eq("email", trimmedEmail)
      .gte("submitted_at", oneHourAgo);

    if (hourlyCount !== null && hourlyCount >= MAX_SUBMISSIONS_PER_HOUR) {
      return new Response(JSON.stringify({ error: "Too many requests from this email. Please try again later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: dailyCount } = await supabase
      .from("data_deletion_requests")
      .select("id", { count: "exact", head: true })
      .eq("email", trimmedEmail)
      .gte("submitted_at", oneDayAgo);

    if (dailyCount !== null && dailyCount >= MAX_SUBMISSIONS_PER_DAY) {
      return new Response(JSON.stringify({ error: "Daily submission limit reached. Please try again tomorrow." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate: if same email already has a pending request, don't create a duplicate
    const { data: existingPending } = await supabase
      .from("data_deletion_requests")
      .select("id")
      .eq("email", trimmedEmail)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPending) {
      // Respond exactly as a first-time submission does. A distinguishable reply
      // would tell an anonymous caller whether a given address already has a
      // pending request with us.
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertError } = await supabase.from("data_deletion_requests").insert({
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      account_identifier: trimmedAccount,
      reason: trimmedReason,
      status: "pending",
      submitted_at: new Date().toISOString(),
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-deletion-request error:", err);
    return new Response(
      JSON.stringify({ error: "We could not submit your request. Please try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
