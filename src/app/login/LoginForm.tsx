'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { safeInternalPath } from '@/lib/url';
import { Button, Input, Label, Alert } from '@/components/ui';

export function LoginForm({ redirect, initialError }: { redirect?: string; initialError?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError === 'link_expired'
      ? 'That link has expired or was already used. Please log in, or request a new link.'
      : null,
  );
  // When true, the email looks unverified — offer a resend option.
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnverified(false);
    setResent(false);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setLoading(false);
      const code = (signInError as { code?: string }).code;
      const msg = signInError.message?.toLowerCase() ?? '';
      if (code === 'email_not_confirmed' || msg.includes('not confirmed') || msg.includes('confirm')) {
        setUnverified(true);
        setError('Your email address has not been verified yet.');
      } else {
        // Never leak whether the email exists or which field was wrong.
        setError('We could not sign you in. Please check your details and try again.');
      }
      return;
    }

    router.push(safeInternalPath(redirect, '/caregiver'));
    router.refresh();
  }

  async function onResend() {
    setResent(false);
    setError(null);
    const supabase = createClient();
    await supabase.auth.resend({ type: 'signup', email: email.trim() });
    setResent(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert tone={unverified ? 'warn' : 'error'}>{error}</Alert>}
      {unverified && (
        <div className="text-sm">
          {resent ? (
            <span className="text-[var(--ok)]">Verification email sent — check your inbox.</span>
          ) : (
            <button
              type="button"
              onClick={onResend}
              className="font-medium text-[var(--brand)] hover:underline"
            >
              Resend verification email
            </button>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="mb-1 text-sm text-[var(--brand)] hover:underline">
            Forgot?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? 'Signing in…' : 'Log in'}
      </Button>

      <p className="text-center text-sm text-[var(--muted)]">
        New here?{' '}
        <Link href="/signup" className="font-medium text-[var(--brand)] hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
