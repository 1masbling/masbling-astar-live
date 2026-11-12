import { isAuthWeakPasswordError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export const PASSWORD_RESET_PATH = '/reset-password';

const apiBase = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EXPIRED_LINK_MESSAGE = 'This reset link is no longer valid. Request a new link and try again.';
const GENERIC_UPDATE_MESSAGE = 'We could not update your password. Request a new link and try again.';
const SESSION_ERROR_CODES = new Set(['session_not_found', 'session_expired', 'bad_jwt', 'no_authorization']);

export async function requestPasswordReset(email: string) {
  try {
    const res = await fetch(`${apiBase}/functions/v1/send-password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ email, appOrigin: window.location.origin }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: typeof data.error === 'string' ? data.error : 'We could not send the reset email. Please try again.' };
    }
    return { error: null };
  } catch {
    return { error: 'We could not send the reset email. Please try again.' };
  }
}

export async function verifyRecoveryToken(tokenHash: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
  if (error) {
    console.error('Recovery link verification failed:', error.message);
    return { error: EXPIRED_LINK_MESSAGE };
  }
  return { error: null };
}

export async function setNewPassword(password: string): Promise<{ error: string | null }> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { error: EXPIRED_LINK_MESSAGE };

  const { error } = await supabase.auth.updateUser({ password });
  if (!error) return { error: null };

  console.error('Password update failed:', error.code, error.message);
  if (isAuthWeakPasswordError(error)) {
    const breached = error.reasons.includes('pwned');
    return {
      error: breached
        ? 'That password has appeared in a known data breach. Choose a different one.'
        : 'That password does not meet the security requirements. Choose a stronger one.',
    };
  }
  if (error.code === 'same_password') return { error: 'Your new password must be different from your old one.' };
  if (error.status === 401 || error.status === 403 || SESSION_ERROR_CODES.has(error.code ?? '')) {
    return { error: EXPIRED_LINK_MESSAGE };
  }
  return { error: GENERIC_UPDATE_MESSAGE };
}
