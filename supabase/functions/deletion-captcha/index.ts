import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function generateCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { question: `${a} + ${b}`, answer: a + b };
}

// The token payload is only base64, which anyone can decode, so it must not carry
// the expected answer in the clear. It carries a salted hash instead: the verifier
// hashes what the visitor typed and compares, and the token reveals nothing.
async function hashAnswer(answer: number | string, jti: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    enc.encode(`${String(answer).trim()}:${jti}:${secret}`),
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signToken(payload: object, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const data = enc.encode(JSON.stringify(payload));
  const sig = await crypto.subtle.sign("HMAC", key, data);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${payloadB64}.${sigB64}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const captcha = generateCaptcha();
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const expiresAt = Date.now() + 10 * 60 * 1000;
    // jti makes the token single-use: the verifier claims this id atomically.
    const jti = crypto.randomUUID();
    const token = await signToken(
      { ah: await hashAnswer(captcha.answer, jti, secret), exp: expiresAt, jti },
      secret,
    );

    return new Response(
      JSON.stringify({ captchaToken: token, question: captcha.question }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    // Never return the raw error: it leaks internal detail. Log it instead.
    console.error("deletion-captcha error:", err);
    return new Response(JSON.stringify({ error: "Could not load the security question. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
