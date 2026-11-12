-- F4: security-question tokens were replayable. This table is the atomic claim:
-- consuming a token means INSERTing its id, so a second use hits the primary key
-- and is rejected. RLS on with no client policies: only the service role writes it.

CREATE TABLE IF NOT EXISTS public.captcha_tokens_used (
  token_id text PRIMARY KEY,
  used_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

ALTER TABLE public.captcha_tokens_used ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_captcha_tokens_used_expires_at
  ON public.captcha_tokens_used (expires_at);

REVOKE ALL ON public.captcha_tokens_used FROM anon, authenticated;
