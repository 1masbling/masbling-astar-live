// Shared CAPTCHA token verification — used by submit-booking and submit-deletion-request.
// Tokens are signed with HMAC-SHA256 using the service role key, so they work
// across separate edge function instances without shared in-memory state.
//
// Tokens are single-use. Verification is not enough on its own: a signature and an
// expiry both still pass on a replayed token, so consuming the token is an atomic
// INSERT of its id into captcha_tokens_used. A duplicate key means it was already
// spent. Read-then-write would let two concurrent callers both pass.

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

export async function verifyCaptchaToken(
  token: string,
  userAnswer: string,
  secret: string,
  supabaseUrl?: string,
): Promise<{ valid: boolean; error?: string }> {
  if (!token || !userAnswer) {
    return { valid: false, error: "Missing security question response" };
  }

  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) {
    return { valid: false, error: "Invalid security token" };
  }

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  // Restore base64 padding
  const sigPadded = sigB64.replace(/-/g, "+").replace(/_/g, "/");
  let sigBin: string;
  let payloadStr: string;
  try {
    sigBin = atob(sigPadded);
    payloadStr = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    return { valid: false, error: "Invalid security token" };
  }

  const sigBuf = new Uint8Array(sigBin.length);
  for (let i = 0; i < sigBin.length; i++) sigBuf[i] = sigBin.charCodeAt(i);

  const valid = await crypto.subtle.verify("HMAC", key, sigBuf, enc.encode(payloadStr));
  if (!valid) {
    return { valid: false, error: "Security token is invalid or tampered with" };
  }

  let payload: { ah?: string; exp: number; jti?: string };
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    return { valid: false, error: "Malformed security token" };
  }

  if (Date.now() > payload.exp) {
    return { valid: false, error: "Security question expired, please refresh and try again" };
  }

  // Atomic single-use claim. A token minted before this change has no jti and is
  // refused rather than allowed through unclaimable.
  if (!payload.jti) {
    return { valid: false, error: "Security question expired, please refresh and try again" };
  }

  // The expected answer is never carried in the token (the payload is only base64
  // and the browser can decode it), so hash what the visitor typed the same way the
  // issuer did and compare the digests.
  if (!payload.ah) {
    return { valid: false, error: "Security question expired, please refresh and try again" };
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    enc.encode(`${String(userAnswer).trim()}:${payload.jti}:${secret}`),
  );
  const attemptHash = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  if (attemptHash !== payload.ah) {
    return { valid: false, error: "Incorrect answer to the security question" };
  }

  const url = supabaseUrl || Deno.env.get("SUPABASE_URL");
  if (!url) {
    return { valid: false, error: "Could not verify the security question" };
  }

  const supabase = createClient(url, secret);
  const { error: claimError } = await supabase
    .from("captcha_tokens_used")
    .insert({
      token_id: payload.jti,
      expires_at: new Date(payload.exp).toISOString(),
    });

  if (claimError) {
    // 23505 is the unique/primary key violation: the token was already spent.
    if (claimError.code === "23505") {
      return { valid: false, error: "This security question was already used, please refresh and try again" };
    }
    console.error("captcha claim failed:", claimError.message);
    return { valid: false, error: "Could not verify the security question" };
  }

  return { valid: true };
}
