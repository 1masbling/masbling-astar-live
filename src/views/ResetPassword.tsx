import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Link2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { PASSWORD_RESET_PATH, setNewPassword, verifyRecoveryToken } from '@/lib/password-reset';
import { isPasswordStrong } from '@/lib/password';
import { COMPANY } from '@/lib/constants';
import PasswordField from '@/components/PasswordField';

const shell = (children: React.ReactNode) => (
  <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
    <div className="w-full max-w-sm">
      <div className="text-center mb-6">
        <img
          src="/0.png"
          alt={COMPANY.name}
          width={680}
          height={680}
          className="mx-auto mb-3 h-32 w-32 object-contain rounded-2xl bg-white p-2 shadow-lg"
        />
        <h1 className="text-lg font-bold text-navy-50 font-display">{COMPANY.name}</h1>
      </div>
      <div className="card p-6">{children}</div>
    </div>
  </div>
);

export default function ResetPassword() {
  const { session, signOut } = useAuth();
  const [verifying, setVerifying] = useState(
    () => new URLSearchParams(window.location.search).has('token_hash'),
  );
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const verifyStarted = useRef(false);

  useEffect(() => {
    if (verifyStarted.current) return;
    verifyStarted.current = true;
    const tokenHash = new URLSearchParams(window.location.search).get('token_hash');
    if (!tokenHash) return;
    window.history.replaceState(null, '', PASSWORD_RESET_PATH);
    (async () => {
      const { error: err } = await verifyRecoveryToken(tokenHash);
      if (err) setLinkError(err);
      setVerifying(false);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isPasswordStrong(password)) {
      setError('Choose a password that meets every requirement below.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const { error: err } = await setNewPassword(password);
      if (err) setError(err);
      else setDone(true);
    } catch {
      setError('We could not update your password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    await signOut();
    window.location.assign('/admin');
  };

  if (verifying) {
    return shell(
      <div className="text-center py-6">
        <Loader2 className="w-8 h-8 text-teal-400 mx-auto mb-3 animate-spin" />
        <p className="text-xs text-navy-300">Checking your reset link...</p>
      </div>,
    );
  }

  if (!session) {
    return shell(
      <div className="text-center py-2 animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-error-900/40 border border-error-700/40 flex items-center justify-center mx-auto mb-3">
          <Link2 className="w-6 h-6 text-error-400" />
        </div>
        <h2 className="text-base font-bold text-navy-50 mb-1">This link has expired</h2>
        <p className="text-xs text-navy-300 mb-5">
          {linkError ?? 'Password reset links can only be used once and expire after a short time. Request a new one from the sign in page.'}
        </p>
        <a href="/admin" className="btn-primary w-full">Back to sign in</a>
      </div>,
    );
  }

  if (done) {
    return shell(
      <div className="text-center py-2 animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-success-900/40 border border-success-700/40 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6 text-success-400" />
        </div>
        <h2 className="text-base font-bold text-navy-50 mb-1">Password updated</h2>
        <p className="text-xs text-navy-300 mb-5">Sign in with your new password to continue.</p>
        <button type="button" onClick={handleContinue} className="btn-primary w-full">Go to sign in</button>
      </div>,
    );
  }

  return shell(
    <>
      <h2 className="text-base font-bold text-navy-50 mb-1">Choose a new password</h2>
      <p className="text-xs text-navy-400 mb-4">Make it strong and unique. You will sign in with it next.</p>

      {error && (
        <div className="rounded-lg bg-error-900/40 border border-error-700/40 p-3 mb-3 flex items-start gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-error-400 mt-0.5 shrink-0" />
          <p className="text-xs text-error-300">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <PasswordField
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          showChecklist
        />
        <PasswordField
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Update password'}
        </button>
      </form>
    </>,
  );
}
