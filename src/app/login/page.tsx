'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { toast } from 'sonner';
import { getClientAuth } from '@/lib/firebase-client';
import { useAuth } from '@/lib/auth-context';

const LINK_EMAIL_KEY = 'tc:emailForSignIn';

type Mode = 'password' | 'link';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>('password');
  const [isNew, setIsNew] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  // Redirect once authenticated.
  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, user, router]);

  // Complete a magic-link sign-in if we landed here from an email link.
  useEffect(() => {
    const auth = getClientAuth();
    if (!isSignInWithEmailLink(auth, window.location.href)) return;
    let stored = window.localStorage.getItem(LINK_EMAIL_KEY);
    if (!stored) {
      stored = window.prompt('Confirm your email to finish signing in') ?? '';
    }
    if (!stored) return;
    setBusy(true);
    signInWithEmailLink(auth, stored, window.location.href)
      .then(() => {
        window.localStorage.removeItem(LINK_EMAIL_KEY);
        toast.success('Signed in');
        router.replace('/');
      })
      .catch((e) => toast.error(friendly(e)))
      .finally(() => setBusy(false));
  }, [router]);

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      const auth = getClientAuth();
      if (isNew) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Account created');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.replace('/');
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      const auth = getClientAuth();
      await sendSignInLinkToEmail(auth, email, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: true,
      });
      window.localStorage.setItem(LINK_EMAIL_KEY, email);
      setLinkSent(true);
      toast.success('Check your email for the sign-in link');
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-ink shadow-card">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" />
              <circle cx="12" cy="10" r="2.4" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text">
            Trip Companion
          </h1>
          <p className="mt-1 text-sm text-text-dim">Your living itinerary.</p>
        </div>

        {/* Mode switch */}
        <div className="mb-4 inline-flex w-full rounded-lg border border-border bg-surface-2 p-0.5">
          {(['password', 'link'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === m ? 'bg-surface text-text shadow-sm' : 'text-text-mute'
              }`}
            >
              {m === 'password' ? 'Email & password' : 'Magic link'}
            </button>
          ))}
        </div>

        {mode === 'password' ? (
          <form className="space-y-3" onSubmit={handlePassword}>
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-ink transition-opacity disabled:opacity-60"
            >
              {busy ? 'Please wait…' : isNew ? 'Create account' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => setIsNew((v) => !v)}
              className="w-full text-center text-xs font-medium text-primary"
            >
              {isNew ? 'Have an account? Sign in' : 'New here? Create an account'}
            </button>
          </form>
        ) : linkSent ? (
          <div className="rounded-lg border border-border bg-surface p-4 text-center">
            <p className="text-sm text-text">
              Link sent to <span className="font-medium">{email}</span>.
            </p>
            <p className="mt-1 text-xs text-text-mute">
              Open it on this device to finish signing in.
            </p>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSendLink}>
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-ink transition-opacity disabled:opacity-60"
            >
              {busy ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-mute">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'current-password' : 'email'}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-mute focus:border-primary focus:outline-none"
      />
    </label>
  );
}

function friendly(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/invalid-email': 'That email looks off.',
    'auth/email-already-in-use': 'That email already has an account — sign in instead.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Try again shortly.',
    'auth/operation-not-allowed': 'That sign-in method is not enabled in Firebase.',
  };
  return map[code] ?? (err as Error)?.message ?? 'Something went wrong.';
}
