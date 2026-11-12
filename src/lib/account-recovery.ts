const apiBase = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function requestEmailRecovery(name: string, phone: string) {
  const res = await fetch(`${apiBase}/functions/v1/account-recovery-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ name, phone }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: typeof data.error === 'string' ? data.error : 'We could not process your request. Please call us instead.' };
  }
  return { error: null };
}
