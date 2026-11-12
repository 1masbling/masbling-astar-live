import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { verifyCaptchaToken } from "../_shared/captcha.ts";
import { checkAndRecord } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_NAME_LEN = 200;
const MAX_PHONE_LEN = 50;
const MAX_EMAIL_LEN = 320;
const MAX_ADDRESS_LEN = 300;
const MAX_NOTES_LEN = 2000;
const MAX_REFERRER_LEN = 500;
const MAX_LEAD_SOURCE_LEN = 100;
const MAX_PER_HOUR = 5;
const MAX_PER_DAY = 15;
const MAX_SERVICES = 20;
const ONTARIO_TAX_RATE = 0.13;

const URL_REGEX = /https?:\/\/|www\./i;
const SPAM_KEYWORDS = /\b(viagra|casino|seo|backlink|crypto|betting|gambling|loan)\b/i;
const PHONE_REGEX = /^[\d\s\-\(\)\+]{7,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface ServiceSelection {
  key: string;
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
  return `${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith("1")) return `1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  return raw;
}

async function sendOwnerNotificationEmail(
  params: {
    name: string;
    phone: string;
    email: string;
    address: string;
    services: ServiceSelection[];
    subtotal: number;
    taxAmount: number;
    total: number;
    date: string;
    timeWindow: string;
    notes: string;
    jobId: string | null;
    estimateId: string | null;
    leadSource: string;
    referrer: string;
    utm: { utm_source?: string; utm_medium?: string; utm_campaign?: string } | null;
  },
  supabase: ReturnType<typeof createClient>,
): Promise<{ status: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const ownerEmail = Deno.env.get("OWNER_EMAIL") || "info@masblingastarservices.com";
  const serviceList = params.services.map(s => s.label).join(", ");
  const subject = `New Booking: ${serviceList} — ${params.name} on ${params.date}`.slice(0, 200).replace(/[\r\n]/g, " ");

  if (!resendApiKey) {
    console.error("RESEND_API_KEY not set — owner email notification skipped");
    await supabase.from("notifications").insert({
      type: "email",
      recipient: ownerEmail,
      recipient_name: params.name,
      subject,
      body: "Owner booking notification — RESEND_API_KEY not configured",
      status: "pending",
      related_job_id: params.jobId,
      related_invoice_id: null,
      sent_at: null,
    });
    return { status: "pending" };
  }

  const companyName = "MASBLING A STAR SERVICES";

  const eName = escapeHtml(params.name);
  const ePhone = escapeHtml(formatPhone(params.phone));
  const eEmail = escapeHtml(params.email);
  const eAddress = escapeHtml(params.address);
  const eDate = escapeHtml(params.date);
  const eTimeWindow = escapeHtml(params.timeWindow);
  const eNotes = escapeHtml(params.notes);
  const eJobId = params.jobId ? escapeHtml(params.jobId) : "";

  const serviceBullets = params.services.map(s =>
    `<tr>
      <td style="padding:5px 0;font-size:14px;color:#f1f5f9;line-height:1.6;">&#8226;&nbsp;&nbsp;${escapeHtml(s.label)}</td>
      <td style="padding:5px 0;font-size:14px;color:#fbbf24;font-weight:700;text-align:right;white-space:nowrap;">${formatCurrency(s.price)}</td>
    </tr>`
  ).join("");

  const notesSection = params.notes
    ? `<p style="margin:16px 0 6px;font-size:14px;font-weight:700;color:#fbbf24;">Customer Notes</p><p style="margin:0 0 20px;font-size:14px;color:#f1f5f9;line-height:1.6;">${eNotes}</p>`
    : "";

  const attributionParts: string[] = [];
  if (params.leadSource) attributionParts.push(`<strong style="color:#fbbf24;">Lead Source:</strong>&nbsp; ${escapeHtml(params.leadSource)}`);
  if (params.referrer) attributionParts.push(`<strong style="color:#fbbf24;">Referrer:</strong>&nbsp; ${escapeHtml(params.referrer)}`);
  if (params.utm) {
    const utmBits: string[] = [];
    if (params.utm.utm_source) utmBits.push(escapeHtml(params.utm.utm_source));
    if (params.utm.utm_medium) utmBits.push(escapeHtml(params.utm.utm_medium));
    if (params.utm.utm_campaign) utmBits.push(escapeHtml(params.utm.utm_campaign));
    if (utmBits.length > 0) attributionParts.push(`<strong style="color:#fbbf24;">Campaign:</strong>&nbsp; ${utmBits.join(" / ")}`);
  }
  const attributionSection = attributionParts.length > 0
    ? `<p style="margin:16px 0 6px;font-size:14px;font-weight:700;color:#fbbf24;">Lead Attribution</p><p style="margin:0 0 20px;font-size:13px;color:#94a3b8;line-height:1.8;">${attributionParts.join("<br>")}</p>`
    : "";

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
            <h1 style="margin:4px 0 0;font-size:22px;color:#1c1917;font-weight:800;">New Booking Request</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;">
            <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;">A new booking has been submitted through your website. Please review the details below and follow up with the customer within 24 hours.</p>

            <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#fbbf24;">Customer Details</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
              <tr><td style="padding:4px 0;font-size:14px;color:#94a3b8;width:90px;vertical-align:top;">Name</td><td style="padding:4px 0;font-size:14px;color:#f1f5f9;font-weight:600;">${eName}</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#94a3b8;vertical-align:top;">Phone</td><td style="padding:4px 0;font-size:14px;color:#f1f5f9;"><a href="tel:${ePhone}" style="color:#fbbf24;text-decoration:none;">${ePhone}</a></td></tr>
              ${params.email ? `<tr><td style="padding:4px 0;font-size:14px;color:#94a3b8;vertical-align:top;">Email</td><td style="padding:4px 0;font-size:14px;color:#f1f5f9;">${eEmail}</td></tr>` : ""}
              <tr><td style="padding:4px 0;font-size:14px;color:#94a3b8;vertical-align:top;">Address</td><td style="padding:4px 0;font-size:14px;color:#f1f5f9;">${eAddress}</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#94a3b8;vertical-align:top;">Date</td><td style="padding:4px 0;font-size:14px;color:#f1f5f9;">${eDate}</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#94a3b8;vertical-align:top;">Time</td><td style="padding:4px 0;font-size:14px;color:#f1f5f9;">${eTimeWindow}</td></tr>
            </table>

            <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#fbbf24;">Requested Services</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
              ${serviceBullets}
            </table>

            <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#fbbf24;">Estimate Summary</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #334155;border-radius:8px;overflow:hidden;margin-bottom:20px;">
              <tr style="border-bottom:1px solid #334155;">
                <td style="padding:10px 14px;font-size:14px;color:#94a3b8;font-weight:600;">Subtotal</td>
                <td style="padding:10px 14px;font-size:14px;color:#f1f5f9;text-align:right;">${formatCurrency(params.subtotal)}</td>
              </tr>
              <tr style="border-bottom:1px solid #334155;">
                <td style="padding:8px 14px;font-size:14px;color:#94a3b8;font-weight:600;">HST (13%)</td>
                <td style="padding:8px 14px;font-size:14px;color:#f1f5f9;text-align:right;">${formatCurrency(params.taxAmount)}</td>
              </tr>
              <tr style="background:#ca8a04;">
                <td style="padding:12px 14px;font-size:16px;color:#1c1917;font-weight:800;">Total</td>
                <td style="padding:12px 14px;font-size:16px;color:#1c1917;font-weight:800;text-align:right;">${formatCurrency(params.total)}</td>
              </tr>
            </table>

            ${notesSection}
            ${attributionSection}

            ${params.jobId ? `<p style="margin:20px 0 0;font-size:12px;color:#64748b;">Reference: Job ${eJobId}${params.estimateId ? ` &middot; Estimate ${escapeHtml(params.estimateId)}` : ""}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="background:#0f172a;padding:16px 28px;border-top:1px solid #334155;">
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">${companyName} &middot; 437-440-4072 &middot; info@masblingastarservices.com<br>This booking notification was generated by your website booking system.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Booking Notifications <bookings@masblingastarservices.com>",
        to: [ownerEmail],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Owner email send failed:", res.status, errText);
      await supabase.from("notifications").insert({
        type: "email",
        recipient: ownerEmail,
        recipient_name: params.name,
        subject,
        body: errText.slice(0, 500) || `HTTP ${res.status}`,
        status: "failed",
        related_job_id: params.jobId,
        related_invoice_id: null,
        sent_at: null,
      });
      return { status: "failed" };
    }
    await supabase.from("notifications").insert({
      type: "email",
      recipient: ownerEmail,
      recipient_name: params.name,
      subject,
      body: "Owner booking notification sent via Resend",
      status: "sent",
      related_job_id: params.jobId,
      related_invoice_id: null,
      sent_at: new Date().toISOString(),
    });
    return { status: "sent" };
  } catch (err) {
    console.error("Owner email exception:", err);
    await supabase.from("notifications").insert({
      type: "email",
      recipient: ownerEmail,
      recipient_name: params.name,
      subject,
      body: String(err).slice(0, 500),
      status: "failed",
      related_job_id: params.jobId,
      related_invoice_id: null,
      sent_at: null,
    });
    return { status: "failed" };
  }
}

async function sendCustomerConfirmationEmail(
  params: {
    name: string;
    email: string;
    services: ServiceSelection[];
    subtotal: number;
    taxAmount: number;
    total: number;
    date: string;
    timeWindow: string;
  },
  supabase: ReturnType<typeof createClient>,
): Promise<{ status: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const ownerEmail = Deno.env.get("OWNER_EMAIL") || "info@masblingastarservices.com";
  const serviceList = params.services.map(s => s.label).join(", ");
  const subject = `Your Booking Confirmation — ${serviceList} on ${params.date}`.slice(0, 200).replace(/[\r\n]/g, " ");

  if (!resendApiKey) {
    console.error("RESEND_API_KEY not set — customer email skipped");
    await supabase.from("notifications").insert({
      type: "email",
      recipient: params.email,
      recipient_name: params.name,
      subject,
      body: "Customer confirmation — RESEND_API_KEY not configured",
      status: "pending",
      related_job_id: null,
      related_invoice_id: null,
      sent_at: null,
    });
    return { status: "pending" };
  }

  const companyName = "MASBLING A STAR SERVICES";
  const eName = escapeHtml(params.name);
  const eDate = escapeHtml(params.date);
  const eTimeWindow = escapeHtml(params.timeWindow);

  const serviceBullets = params.services.map(s =>
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
            <h1 style="margin:4px 0 0;font-size:22px;color:#1c1917;font-weight:800;">Booking Confirmation</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;">
            <p style="margin:0 0 20px;color:#f1f5f9;font-size:16px;">Hi ${eName},</p>
            <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.6;">Thank you for choosing ${companyName}. We have received your booking request. A team member will contact you shortly to finalize your time slot and confirm your appointment.</p>

            <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#fbbf24;">Appointment Details</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
              <tr><td style="padding:4px 0;font-size:14px;color:#94a3b8;width:90px;vertical-align:top;">Date</td><td style="padding:4px 0;font-size:14px;color:#f1f5f9;">${eDate}</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#94a3b8;vertical-align:top;">Time</td><td style="padding:4px 0;font-size:14px;color:#f1f5f9;">${eTimeWindow}</td></tr>
            </table>

            <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#fbbf24;">Your Services</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
              ${serviceBullets}
            </table>

            <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#fbbf24;">Price Breakdown</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #334155;border-radius:8px;overflow:hidden;margin-bottom:20px;">
              <tr style="border-bottom:1px solid #334155;">
                <td style="padding:10px 14px;font-size:14px;color:#94a3b8;font-weight:600;">Subtotal</td>
                <td style="padding:10px 14px;font-size:14px;color:#f1f5f9;text-align:right;">${formatCurrency(params.subtotal)}</td>
              </tr>
              <tr style="border-bottom:1px solid #334155;">
                <td style="padding:8px 14px;font-size:14px;color:#94a3b8;font-weight:600;">HST (13%)</td>
                <td style="padding:8px 14px;font-size:14px;color:#f1f5f9;text-align:right;">${formatCurrency(params.taxAmount)}</td>
              </tr>
              <tr style="background:#ca8a04;">
                <td style="padding:12px 14px;font-size:16px;color:#1c1917;font-weight:800;">Total (incl. HST)</td>
                <td style="padding:12px 14px;font-size:16px;color:#1c1917;font-weight:800;text-align:right;">${formatCurrency(params.total)}</td>
              </tr>
            </table>

            <div style="background:#1e293b;border:1px solid #ca8a04;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
              <p style="margin:0;font-size:13px;color:#fbbf24;font-weight:700;line-height:1.6;">Please Note: A valid credit card must be placed on file in advance to secure your booking slot. Payment will only be processed after before-and-after photos of the completed service are sent to you.</p>
            </div>

            <p style="margin:20px 0 0;color:#94a3b8;font-size:14px;line-height:1.6;">If you need to reschedule or have any questions, please reply to this email or call us at 437-440-4072. We look forward to serving you.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#0f172a;padding:16px 28px;border-top:1px solid #334155;">
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">${companyName} &middot; 437-440-4072 &middot; info@masblingastarservices.com<br>Thank you for your business.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Masbling Astar Services <info@masblingastarservices.com>",
        to: [params.email, ownerEmail],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Customer email send failed:", res.status, errText);
      await supabase.from("notifications").insert({
        type: "email",
        recipient: params.email,
        recipient_name: params.name,
        subject,
        body: errText.slice(0, 500) || `HTTP ${res.status}`,
        status: "failed",
        related_job_id: null,
        related_invoice_id: null,
        sent_at: null,
      });
      return { status: "failed" };
    }
    await supabase.from("notifications").insert({
      type: "email",
      recipient: params.email,
      recipient_name: params.name,
      subject,
      body: "Customer confirmation sent via Resend",
      status: "sent",
      related_job_id: null,
      related_invoice_id: null,
      sent_at: new Date().toISOString(),
    });
    return { status: "sent" };
  } catch (err) {
    console.error("Customer email exception:", err);
    await supabase.from("notifications").insert({
      type: "email",
      recipient: params.email,
      recipient_name: params.name,
      subject,
      body: String(err).slice(0, 500),
      status: "failed",
      related_job_id: null,
      related_invoice_id: null,
      sent_at: null,
    });
    return { status: "failed" };
  }
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
      name,
      phone,
      email,
      address,
      date,
      timeWindow,
      notes,
      honeypot,
      leadSource,
      referrer,
      utm,
      captchaToken,
      captchaAnswer,
    } = await req.json();

    // Honeypot: if filled, silently succeed (bot caught)
    if (honeypot) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!services || !Array.isArray(services) || services.length === 0 || !name || !phone || !address || !date || !timeWindow) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (services.length > MAX_SERVICES) {
      return new Response(
        JSON.stringify({ error: "Too many services selected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const trimmedName = String(name).trim().slice(0, MAX_NAME_LEN);
    const trimmedPhone = String(phone).trim().slice(0, MAX_PHONE_LEN);
    const trimmedEmail = email ? String(email).trim().slice(0, MAX_EMAIL_LEN) : "";
    const trimmedAddress = String(address).trim().slice(0, MAX_ADDRESS_LEN);
    const trimmedNotes = notes ? String(notes).trim().slice(0, MAX_NOTES_LEN) : "";
    const trimmedLeadSource = leadSource ? String(leadSource).trim().slice(0, MAX_LEAD_SOURCE_LEN) : "";
    const trimmedReferrer = referrer ? String(referrer).trim().slice(0, MAX_REFERRER_LEN) : "";

    const ALLOWED_LEAD_SOURCES = ['Google Search', 'Google Maps', 'Friend/Neighbor', 'Flyer/Sign', 'Facebook', 'Other'];
    const safeLeadSource = ALLOWED_LEAD_SOURCES.includes(trimmedLeadSource) ? trimmedLeadSource : "";

    let safeUtm: { utm_source?: string; utm_medium?: string; utm_campaign?: string } | null = null;
    if (utm && typeof utm === 'object') {
      const u: { utm_source?: string; utm_medium?: string; utm_campaign?: string } = {};
      if (typeof utm.utm_source === 'string') u.utm_source = utm.utm_source.slice(0, 200);
      if (typeof utm.utm_medium === 'string') u.utm_medium = utm.utm_medium.slice(0, 200);
      if (typeof utm.utm_campaign === 'string') u.utm_campaign = utm.utm_campaign.slice(0, 200);
      if (Object.keys(u).length > 0) safeUtm = u;
    }

    if (trimmedName.length < 2) {
      return new Response(JSON.stringify({ error: "Name is too short" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!PHONE_REGEX.test(trimmedPhone)) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The confirmation email is sent to this address, so an unvalidated value turns
    // the endpoint into a way to deliver mail from our domain to anyone.
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Spam detection
    const allText = `${trimmedName} ${trimmedPhone} ${trimmedEmail} ${trimmedAddress} ${trimmedNotes}`;
    if (URL_REGEX.test(allText) || SPAM_KEYWORDS.test(allText)) {
      return new Response(JSON.stringify({ error: "Submission flagged as spam" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single-use signed CAPTCHA
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

    // Validate date is not in the past
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return new Response(JSON.stringify({ error: "Cannot book a date in the past" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate every selected service key against the services table
    const serviceKeys = services.map((s: ServiceSelection) => String(s.key));
    const { data: serviceRows } = await supabase
      .from("services")
      .select("key, label, price")
      .in("key", serviceKeys);

    if (!serviceRows || serviceRows.length !== serviceKeys.length) {
      return new Response(JSON.stringify({ error: "One or more unknown services selected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the validated service list entirely from the services table. Any price
    // in the request body is ignored: it is attacker-controlled, and it used to be
    // what the job value, estimate total and line items were recorded from.
    const validatedServices: ServiceSelection[] = services.map((s: ServiceSelection) => {
      const dbRow = serviceRows.find(r => r.key === s.key);
      return {
        key: s.key,
        label: dbRow?.label || s.key,
        price: Math.max(0, Math.round(Number(dbRow?.price ?? 0) * 100) / 100),
      };
    });

    const subtotal = validatedServices.reduce((sum, s) => sum + s.price, 0);
    const taxAmount = Math.round(subtotal * ONTARIO_TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    // Rate limiting by phone
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: hourlyCount } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("customer_phone", trimmedPhone)
      .gte("created_at", oneHourAgo);

    if (hourlyCount !== null && hourlyCount >= MAX_PER_HOUR) {
      return new Response(JSON.stringify({ error: "Too many bookings from this phone number. Please try again later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: dailyCount } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("customer_phone", trimmedPhone)
      .gte("created_at", oneDayAgo);

    if (dailyCount !== null && dailyCount >= MAX_PER_DAY) {
      return new Response(JSON.stringify({ error: "Daily booking limit reached. Please call us at " + (Deno.env.get("COMPANY_PHONE") || "our office") + "." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit by email too: the phone limit alone is trivially sidestepped by
    // varying the phone number while aiming the confirmation mail at one victim.
    if (trimmedEmail) {
      const emailLimit = await checkAndRecord(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        "booking",
        trimmedEmail,
        MAX_PER_HOUR,
        MAX_PER_DAY,
      );
      if (!emailLimit.allowed) {
        return new Response(JSON.stringify({ error: emailLimit.error }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Find or create customer
    let customerId: string | null = null;

    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .ilike("name", trimmedName)
      .eq("phone", trimmedPhone)
      .maybeSingle();

    if (existing) {
      customerId = existing.id;
    } else {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({
          name: trimmedName,
          phone: trimmedPhone,
          email: trimmedEmail,
          address: trimmedAddress,
          notes: "",
        })
        .select("id")
        .single();
      if (newCustomer) customerId = newCustomer.id;
    }

    // Create the job with the primary (first) service key
    const primaryServiceKey = validatedServices[0].key;
    const { data: job } = await supabase
      .from("jobs")
      .insert({
        service_key: primaryServiceKey,
        customer_id: customerId,
        customer_name: trimmedName,
        customer_phone: trimmedPhone,
        address: trimmedAddress,
        status: "estimate",
        urgent: false,
        value: total,
        scheduled_date: date || null,
        time_window: timeWindow || null,
        technician_id: null,
        rating: null,
        notes: trimmedNotes,
        lead_source: safeLeadSource || null,
        referrer: trimmedReferrer || null,
        utm_data: safeUtm,
      })
      .select("id")
      .single();

    // Create an estimate with line items for each selected service
    let estimateId: string | null = null;
    if (job) {
      const estimateNumber = `EST-${Date.now()}`;
      const { data: estimate } = await supabase
        .from("estimates")
        .insert({
          number: estimateNumber,
          customer_id: customerId,
          customer_name: trimmedName,
          job_id: job.id,
          status: "draft",
          subtotal,
          tax_rate: ONTARIO_TAX_RATE * 100,
          total,
          notes: trimmedNotes || `Auto-generated from website booking for: ${validatedServices.map(s => s.label).join(", ")}`,
        })
        .select("id")
        .single();

      if (estimate) {
        estimateId = estimate.id;
        const lineItems = validatedServices.map((s, i) => ({
          estimate_id: estimate.id,
          description: s.label,
          quantity: 1,
          unit_price: s.price,
          sort_order: i,
        }));
        await supabase.from("estimate_line_items").insert(lineItems);
      }
    }

    // Send SMS confirmation
    if (phone) {
      const serviceListLabel = validatedServices.length > 1
        ? `${validatedServices.length} services`
        : validatedServices[0].label;
      const smsBody = `Hi ${trimmedName.split(" ")[0] || "there"}, your booking for ${serviceListLabel} on ${date} (${timeWindow}) has been received. Quote total: ${formatCurrency(total)}. We'll confirm your appointment shortly.`;

      let smsStatus = "pending";
      const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioFromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

      if (twilioAccountSid && twilioAuthToken && twilioFromNumber) {
        try {
          const toNumber = trimmedPhone.replace(/[^0-9]/g, "");
          const fullTo = toNumber.length === 10 ? `+1${toNumber}` : `+${toNumber}`;
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
          const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
          const smsResponse = await fetch(twilioUrl, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${authHeader}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              From: twilioFromNumber,
              To: fullTo,
              Body: smsBody,
            }),
          });
          if (smsResponse.ok) {
            smsStatus = "sent";
          } else {
            smsStatus = "failed";
            const smsErr = await smsResponse.text().catch(() => "");
            console.error("Twilio SMS failed:", smsResponse.status, smsErr);
          }
        } catch (smsErr) {
          smsStatus = "failed";
          console.error("Twilio SMS exception:", smsErr);
        }
      } else {
        console.error("Twilio credentials not set — SMS notification skipped");
      }

      await supabase.from("notifications").insert({
        type: "sms",
        recipient: trimmedPhone,
        recipient_name: trimmedName,
        subject: "Booking Confirmation",
        body: smsBody,
        status: smsStatus,
        related_job_id: job?.id || null,
        related_invoice_id: null,
        sent_at: smsStatus === "sent" ? new Date().toISOString() : null,
      });
    }

    // Send email notifications in the background so the booking response returns quickly
    EdgeRuntime.waitUntil(
      sendOwnerNotificationEmail({
        name: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail,
        address: trimmedAddress,
        services: validatedServices,
        subtotal,
        taxAmount,
        total,
        date,
        timeWindow,
        notes: trimmedNotes,
        jobId: job?.id || null,
        estimateId,
        leadSource: safeLeadSource,
        referrer: trimmedReferrer,
        utm: safeUtm,
      }, supabase).catch((err) => console.error("Owner email uncaught:", err)),
    );

    if (trimmedEmail) {
      EdgeRuntime.waitUntil(
        sendCustomerConfirmationEmail({
          name: trimmedName,
          email: trimmedEmail,
          services: validatedServices,
          subtotal,
          taxAmount,
          total,
          date,
          timeWindow,
        }, supabase).catch((err) => console.error("Customer email uncaught:", err)),
      );
    }

    return new Response(
      JSON.stringify({ success: true, jobId: job?.id ?? null, estimateId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("submit-booking error:", err);
    return new Response(
      JSON.stringify({ error: "We could not process your booking. Please try again or call us." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
