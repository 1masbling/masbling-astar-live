import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { checkAndRecord } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_NAME_LEN = 200;
const MAX_PHONE_LEN = 50;
const MAX_ADDRESS_LEN = 300;
const MAX_MEDIA_FILES = 20;
const MAX_SERVICES = 20;
const MAX_PER_HOUR = 5;
const MAX_PER_DAY = 15;

const URL_REGEX = /https?:\/\/|www\./i;
const SPAM_KEYWORDS = /\b(viagra|casino|seo|backlink|crypto|betting|gambling|loan)\b/i;
const PHONE_REGEX = /^[\d\s\-\(\)\+]{7,}$/;

interface EstimateService {
  label: string;
  price: number;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith("1")) return `1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  return raw;
}

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
    const {
      services,
      customerName,
      phone,
      address,
      paymentMethod,
      subtotal,
      taxAmount,
      total,
      customQuoteFlag,
      mediaFiles,
    } = await req.json();

    if (!services || !Array.isArray(services) || services.length === 0) {
      return new Response(JSON.stringify({ error: "No services selected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (services.length > MAX_SERVICES) {
      return new Response(JSON.stringify({ error: "Too many services selected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedName = String(customerName || "").trim().slice(0, MAX_NAME_LEN);
    const trimmedPhone = String(phone || "").trim().slice(0, MAX_PHONE_LEN);
    const trimmedAddress = String(address || "").trim().slice(0, MAX_ADDRESS_LEN);

    if (trimmedName.length < 2) {
      return new Response(JSON.stringify({ error: "Name is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!PHONE_REGEX.test(trimmedPhone)) {
      return new Response(JSON.stringify({ error: "Valid phone number is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (trimmedAddress.length < 5) {
      return new Response(JSON.stringify({ error: "Property address is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allText = `${trimmedName} ${trimmedPhone} ${trimmedAddress}`;
    if (URL_REGEX.test(allText) || SPAM_KEYWORDS.test(allText)) {
      return new Response(JSON.stringify({ error: "Submission flagged as spam" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MAX_PER_HOUR / MAX_PER_DAY were declared here but never applied, so this
    // endpoint sent an email on every call with no ceiling at all.
    const limit = await checkAndRecord(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      "estimate",
      trimmedPhone,
      MAX_PER_HOUR,
      MAX_PER_DAY,
    );
    if (!limit.allowed) {
      return new Response(JSON.stringify({ error: limit.error }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validatedServices: EstimateService[] = services.map((s: EstimateService) => ({
      label: String(s.label).slice(0, 300),
      price: Math.max(0, Math.round(Number(s.price) * 100) / 100),
    }));

    const safeSubtotal = Math.max(0, Math.round(Number(subtotal) * 100) / 100);
    const safeTaxAmount = Math.max(0, Math.round(Number(taxAmount) * 100) / 100);
    const safeTotal = Math.max(0, Math.round(Number(total) * 100) / 100);
    const safeCustomQuoteFlag = Boolean(customQuoteFlag);
    const safePaymentMethod = String(paymentMethod || "Not specified").slice(0, 100);

    const hstAmount = Math.round(safeSubtotal * 0.13 * 100) / 100;
    const grandTotal = Math.round((safeSubtotal + hstAmount) * 100) / 100;
    const MEDIA_PATH_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]{1,150}$/;
    const rawMediaFiles = Array.isArray(mediaFiles) ? mediaFiles : [];
    if (rawMediaFiles.length > MAX_MEDIA_FILES) {
      return new Response(JSON.stringify({ error: "Too many files attached" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const safeMediaFiles = rawMediaFiles.map((f: Record<string, unknown>) => {
      const path = typeof f?.path === "string" ? f.path : "";
      return {
        path,
        name: String(f?.name ?? "").slice(0, 200),
        type: String(f?.type ?? "").slice(0, 100),
        size: Math.max(0, Math.round(Number(f?.size) || 0)),
      };
    });
    if (safeMediaFiles.some(f => !MEDIA_PATH_REGEX.test(f.path))) {
      return new Response(JSON.stringify({ error: "Invalid file reference" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error: saveError } = await supabase.from("estimates").insert({
      number: `EST-${Date.now()}`,
      customer_name: trimmedName,
      status: "draft",
      subtotal: safeSubtotal,
      tax_rate: 13,
      total: grandTotal,
      media_files: safeMediaFiles,
      notes: [
        `Phone: ${trimmedPhone}`,
        `Address: ${trimmedAddress}`,
        `Payment: ${safePaymentMethod}`,
        `HST: ${hstAmount.toFixed(2)}`,
        safeCustomQuoteFlag ? "Contains custom-quote items" : null,
        `Services: ${validatedServices.map(s => `${s.label} (${s.price.toFixed(2)})`).join("; ")}`,
      ].filter(Boolean).join("\n"),
    });
    if (saveError) {
      console.error("Estimate save failed:", saveError.message);
      return new Response(JSON.stringify({ error: "Could not save your estimate. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const primaryServiceLabel = validatedServices[0].label;
    const subject = `New Estimate Request: ${primaryServiceLabel} - ${trimmedName}`.slice(0, 200).replace(/[\r\n]/g, " ");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const ownerEmail = Deno.env.get("OWNER_EMAIL") || "info@masblingastarservices.com";
    const companyName = "MASBLING A STAR SERVICES";

    const eName = escapeHtml(trimmedName);
    const ePhone = escapeHtml(formatPhone(trimmedPhone));
    const eAddress = escapeHtml(trimmedAddress);
    const ePaymentMethod = escapeHtml(safePaymentMethod);

    const serviceBullets = validatedServices.map(s =>
      `<tr>
        <td style="padding:5px 0;font-size:14px;color:#f1f5f9;line-height:1.6;">&#8226;&nbsp;&nbsp;${escapeHtml(s.label)}</td>
        <td style="padding:5px 0;font-size:14px;color:#fbbf24;font-weight:700;text-align:right;white-space:nowrap;">${formatCurrency(s.price)}</td>
      </tr>`
    ).join("");

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#1e293b;border-radius:12px;border:1px solid #334155;overflow:hidden;">
        <tr>
          <td style="background:#ca8a04;padding:20px 28px;">
            <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:2px;color:#1c1917;text-transform:uppercase;">${companyName}</p>
            <h1 style="margin:4px 0 0;font-size:22px;color:#1c1917;font-weight:800;">New Estimate Request</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;">
            <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.6;">A new estimate has been successfully calculated on your website. Review the project scope details below:</p>

            <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#fbbf24;">Client Profile</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
              <tr><td style="padding:4px 0;font-size:14px;color:#94a3b8;width:100px;vertical-align:top;">Full Name</td><td style="padding:4px 0;font-size:14px;color:#f1f5f9;font-weight:600;">${eName}</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#94a3b8;vertical-align:top;">Phone</td><td style="padding:4px 0;font-size:14px;color:#f1f5f9;"><a href="tel:${ePhone}" style="color:#fbbf24;text-decoration:none;">${ePhone}</a></td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#94a3b8;vertical-align:top;">Address</td><td style="padding:4px 0;font-size:14px;color:#f1f5f9;">${eAddress}</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#94a3b8;vertical-align:top;">Payment</td><td style="padding:4px 0;font-size:14px;color:#f1f5f9;">${ePaymentMethod}</td></tr>
            </table>

            <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#fbbf24;">Configured Work Scope</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
              ${serviceBullets}
            </table>

            <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#fbbf24;">Mathematical Breakdown</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #334155;border-radius:8px;overflow:hidden;margin-bottom:20px;">
              <tr style="border-bottom:1px solid #334155;">
                <td style="padding:10px 14px;font-size:14px;color:#94a3b8;font-weight:600;">Estimated Subtotal</td>
                <td style="padding:10px 14px;font-size:14px;color:#f1f5f9;text-align:right;">${formatCurrency(safeSubtotal)}</td>
              </tr>
              <tr style="border-bottom:1px solid #334155;">
                <td style="padding:8px 14px;font-size:14px;color:#94a3b8;font-weight:600;">Ontario HST (13%)</td>
                <td style="padding:8px 14px;font-size:14px;color:#f1f5f9;text-align:right;">${formatCurrency(safeTaxAmount)}</td>
              </tr>
              <tr style="background:#ca8a04;">
                <td style="padding:12px 14px;font-size:16px;color:#1c1917;font-weight:800;">Estimated Grand Total</td>
                <td style="padding:12px 14px;font-size:16px;color:#1c1917;font-weight:800;text-align:right;">${formatCurrency(safeTotal)}</td>
              </tr>
            </table>

            ${safeCustomQuoteFlag ? `<div style="background:#422006;border:1px solid #ca8a04;border-radius:8px;padding:12px 16px;margin-bottom:20px;"><p style="margin:0;font-size:13px;color:#fbbf24;font-weight:600;line-height:1.6;">NOTE: This order contains items that require an on-site evaluation for a manual custom quote.</p></div>` : ""}
          </td>
        </tr>
        <tr>
          <td style="background:#0f172a;padding:16px 28px;border-top:1px solid #334155;">
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">${companyName} &middot; 437-440-4072 &middot; info@masblingastarservices.com<br>This estimate request was generated by your website estimate engine.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not set — estimate email not sent");
      return new Response(JSON.stringify({ success: true, emailSent: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Masbling Astar Services <info@masblingastarservices.com>",
        to: [ownerEmail],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Estimate email send failed:", res.status, errText);
      return new Response(JSON.stringify({ error: "Failed to send estimate email" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, emailSent: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-estimate error:", err);
    return new Response(
      JSON.stringify({ error: "We could not process your estimate request. Please try again or call us." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
