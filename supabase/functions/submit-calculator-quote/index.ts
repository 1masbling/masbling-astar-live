import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { checkAndRecord } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BUCKET = "calculator-uploads";
const HST_RATE = 0.13;
const MAX_MEDIA = 10;
const MAX_PER_HOUR = 5;
const MAX_PER_DAY = 15;
const PATH_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._ -]{1,150}$/;

const SERVICE_CATALOG: Record<string, { label: string; price: number }> = {
  "gutter-bungalow": { label: "Gutter Cleaning (One-Story Bungalow)", price: 190 },
  "gutter-two-story": { label: "Gutter Cleaning (Two-Story House)", price: 220 },
  "window-caulking": { label: "Window Caulking", price: 250 },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const round2 = (n: number) => Math.round(n * 100) / 100;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json();
    const serviceKeys: unknown = body?.services;
    const media: unknown = body?.media ?? [];

    if (!Array.isArray(serviceKeys) || serviceKeys.length === 0 || serviceKeys.length > 10) {
      return json({ error: "Select at least one service" }, 400);
    }
    const services: { label: string; price: number }[] = [];
    for (const key of serviceKeys) {
      const entry = typeof key === "string" ? SERVICE_CATALOG[key] : undefined;
      if (!entry) return json({ error: "Unknown service selected" }, 400);
      services.push(entry);
    }

    if (!Array.isArray(media) || media.length > MAX_MEDIA) {
      return json({ error: "Too many files attached" }, 400);
    }
    const mediaEntries: { path: string; name: string; type: string; size: number }[] = [];
    for (const item of media) {
      const path = typeof item?.path === "string" ? item.path : "";
      if (!PATH_REGEX.test(path)) return json({ error: "Invalid file reference" }, 400);
      mediaEntries.push({
        path,
        name: String(item.name ?? "").slice(0, 150),
        type: String(item.type ?? "").slice(0, 100),
        size: Math.max(0, Math.round(Number(item.size) || 0)),
      });
    }

    const clientIp = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    const limit = await checkAndRecord(supabaseUrl, serviceRoleKey, "calculator", clientIp, MAX_PER_HOUR, MAX_PER_DAY);
    if (!limit.allowed) return json({ error: limit.error }, 429);

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    for (const entry of mediaEntries) {
      const [folder, fileName] = entry.path.split("/");
      const { data: listed, error: listError } = await db.storage
        .from(BUCKET)
        .list(folder, { limit: MAX_MEDIA, search: fileName });
      if (listError) throw listError;
      if (!listed?.some(obj => obj.name === fileName)) {
        return json({ error: "An attached file could not be found. Please attach it again." }, 400);
      }
    }

    const subtotal = round2(services.reduce((sum, s) => sum + s.price, 0));
    const hstAmount = round2(subtotal * HST_RATE);
    const total = round2(subtotal + hstAmount);

    const { data: quote, error: insertError } = await db
      .from("calculator_quotes")
      .insert({
        services,
        subtotal,
        hst_amount: hstAmount,
        total,
        media: mediaEntries,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    return json({ success: true, id: quote.id, subtotal, hstAmount, total });
  } catch (err) {
    console.error("submit-calculator-quote failed:", err);
    return json({ error: "Could not save your quote. Please try again." }, 500);
  }
});
