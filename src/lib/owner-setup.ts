import { requestPasswordReset } from './password-reset';

const apiBase = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function setUpOwnerAccount(email: string) {
  const res = await fetch(`${apiBase}/functions/v1/provision-owner-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: typeof data.error === 'string' ? data.error : 'We could not set up the owner account. Please try again.' };
  }
  return requestPasswordReset(email);
}
