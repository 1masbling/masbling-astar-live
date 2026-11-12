import { useState } from 'react';
import { Mail, AlertCircle, Loader2, CheckCircle2, ArrowLeft, UserRound, Phone, ShieldCheck } from 'lucide-react';
import { useAuth, type SignInMethod } from '@/lib/auth';
import { requestPasswordReset } from '@/lib/password-reset';
import { requestEmailRecovery } from '@/lib/account-recovery';
import { setUpOwnerAccount } from '@/lib/owner-setup';
import { COMPANY } from '@/lib/constants';
import PasswordField from '@/components/PasswordField';

type Mode = 'signin' | 'recover' | 'reset-sent' | 'email-recovery' | 'email-sent' | 'owner-setup';

function ManagementAccess({ onOpenOwnerSetup }: { onOpenOwnerSetup: () => void }) {
  return (
    <div className="mt-4 pt-4 border-t border-navy-800">
      <button
        type="button"
        onClick={onOpenOwnerSetup}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-navy-700 px-4 py-2.5 text-xs font-semibold text-navy-200 hover:border-teal-500/60 hover:text-teal-300 transition-colors"
      >
        <ShieldCheck className="w-4 h-4" /> Set up owner account
      </button>
    </div>
  );
}

export default function SignIn() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [loginMethod, setLoginMethod] = useState<SignInMethod>('email');
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryName, setRecoveryName] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedId = loginId.trim();
    if (!trimmedId || !password) {
      setError(loginMethod === 'email' ? 'Please enter your email and password.' : 'Please enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await signIn(trimmedId, password, loginMethod);
      if (err) setError(err);
    } catch {
      setError('Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter the email address on your account.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await requestPasswordReset(trimmedEmail);
      if (err) setError(err);
      else setMode('reset-sent');
    } catch {
      setError('We could not send the reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter the owner email address.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await setUpOwnerAccount(trimmedEmail);
      if (err) setError(err);
      else setMode('reset-sent');
    } catch {
      setError('We could not set up the owner account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!recoveryName.trim() || !recoveryPhone.trim()) {
      setError('Enter your full name and the phone number on your account.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await requestEmailRecovery(recoveryName.trim(), recoveryPhone.trim());
      if (err) setError(err);
      else setMode('email-sent');
    } catch {
      setError('We could not process your request. Please call us instead.');
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = (
    <button
      type="button"
      onClick={() => switchMode('signin')}
      className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-navy-300 hover:text-navy-100 transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
    </button>
  );

  return (
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
          <p className="text-xs text-navy-400 mt-0.5">{COMPANY.tagline}</p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="rounded-lg bg-error-900/40 border border-error-700/40 p-3 mb-3 flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-error-400 mt-0.5 shrink-0" />
              <p className="text-xs text-error-300">{error}</p>
            </div>
          )}

          {mode === 'signin' && (
            <>
              <h2 className="text-base font-bold text-navy-50 mb-1">Staff Sign In</h2>
              <p className="text-xs text-navy-400 mb-4">Access the operations dashboard</p>

              <form onSubmit={handleSignIn} noValidate className="space-y-3">
                <div role="tablist" aria-label="Sign in with" className="grid grid-cols-2 gap-1 rounded-lg border border-navy-800 bg-navy-900 p-1">
                  {(['email', 'username'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      role="tab"
                      aria-selected={loginMethod === method}
                      onClick={() => {
                        setLoginMethod(method);
                        setLoginId('');
                        setError(null);
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        loginMethod === method ? 'bg-teal-600 text-white' : 'text-navy-300 hover:text-navy-100'
                      }`}
                    >
                      {method === 'email' ? 'Email' : 'Username'}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="label">{loginMethod === 'email' ? 'Email' : 'Username'}</label>
                  <div className="relative">
                    {loginMethod === 'email' ? (
                      <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                    ) : (
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                    )}
                    <input
                      type={loginMethod === 'email' ? 'email' : 'text'}
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      placeholder={loginMethod === 'email' ? 'you@company.com' : 'your username'}
                      autoComplete={loginMethod === 'email' ? 'email' : 'username'}
                      autoCapitalize="none"
                      spellCheck={false}
                      className="input pl-9"
                    />
                  </div>
                </div>
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                  showChecklist
                />
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Sign In'}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => switchMode('recover')}
                    className="text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    Forgot Email / Password?
                  </button>
                </div>
              </form>

              <p className="text-xs text-navy-500 mt-4 text-center">
                Accounts are created by your administrator. Contact us if you need access.
              </p>
              <ManagementAccess onOpenOwnerSetup={() => switchMode('owner-setup')} />
              <div className="mt-4 pt-4 border-t border-navy-800 text-center">
                <a href="#data-deletion" className="text-[11px] text-navy-500 hover:text-navy-300 transition-colors">
                  Request deletion of your account and data
                </a>
              </div>
            </>
          )}

          {mode === 'recover' && (
            <>
              <h2 className="text-base font-bold text-navy-50 mb-1">Reset your password</h2>
              <p className="text-xs text-navy-400 mb-4">
                Enter the email on your account and we will send a secure link to choose a new password.
              </p>

              <form onSubmit={handlePasswordReset} noValidate className="space-y-3">
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      className="input pl-9"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send reset link'}
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-navy-800 flex flex-col items-center gap-3">
                {backToLogin}
                <button
                  type="button"
                  onClick={() => switchMode('email-recovery')}
                  className="text-[11px] text-navy-500 hover:text-navy-300 transition-colors"
                >
                  Forgot your email address instead?
                </button>
              </div>
            </>
          )}

          {mode === 'owner-setup' && (
            <>
              <h2 className="text-base font-bold text-navy-50 mb-1">Set up owner account</h2>
              <p className="text-xs text-navy-400 mb-4">
                Enter the owner email. If it matches the owner on file, we will create the account and email a link to choose a password.
              </p>

              <form onSubmit={handleOwnerSetup} noValidate className="space-y-3">
                <div>
                  <label className="label">Owner email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@company.com"
                      autoComplete="email"
                      className="input pl-9"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send setup link'}
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-navy-800 flex justify-center">{backToLogin}</div>
            </>
          )}

          {mode === 'reset-sent' && (
            <div className="text-center py-2 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-success-900/40 border border-success-700/40 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-success-400" />
              </div>
              <h2 className="text-base font-bold text-navy-50 mb-1">Check your inbox</h2>
              <p className="text-xs text-navy-300 mb-5">
                If an account exists for that email, a reset link is on its way. The link expires after a short time.
              </p>
              {backToLogin}
            </div>
          )}

          {mode === 'email-recovery' && (
            <>
              <h2 className="text-base font-bold text-navy-50 mb-1">Recover your email</h2>
              <p className="text-xs text-navy-400 mb-4">
                Enter your full name and the phone number on your account. We will review the request and contact you.
              </p>

              <form onSubmit={handleEmailRecovery} noValidate className="space-y-3">
                <div>
                  <label className="label">Full name</label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                    <input
                      type="text"
                      value={recoveryName}
                      onChange={(e) => setRecoveryName(e.target.value)}
                      autoComplete="name"
                      className="input pl-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Phone number</label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                    <input
                      type="tel"
                      value={recoveryPhone}
                      onChange={(e) => setRecoveryPhone(e.target.value)}
                      autoComplete="tel"
                      className="input pl-9"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Request email recovery'}
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-navy-800 flex justify-center">{backToLogin}</div>
            </>
          )}

          {mode === 'email-sent' && (
            <div className="text-center py-2 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-success-900/40 border border-success-700/40 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-success-400" />
              </div>
              <h2 className="text-base font-bold text-navy-50 mb-1">Request received</h2>
              <p className="text-xs text-navy-300 mb-5">
                Thanks. We will review your request and contact you using the details on file.
              </p>
              {backToLogin}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
