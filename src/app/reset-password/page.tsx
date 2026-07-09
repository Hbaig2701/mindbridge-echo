'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Label, Alert, cn } from '@/components/ui';

function scorePassword(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  score = Math.min(score, 4);
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: pw ? labels[score] : '' };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = useMemo(() => scorePassword(password), [password]);
  const matchError = confirm.length > 0 && confirm !== password;
  const tooWeak = password.length > 0 && strength.score < 2;

  useEffect(() => {
    // The recovery link is exchanged for a session at /auth/confirm before we get
    // here, so an active session should exist. If not, the link expired.
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user);
      setChecking(false);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (strength.score < 2) {
      setError('Please choose a stronger password.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError('We could not update your password. Your link may have expired — request a new one.');
      return;
    }
    // Sign out so the recovery session can't linger, then send to login.
    await supabase.auth.signOut();
    router.push('/login?reset=success');
    router.refresh();
  }

  const barColors = [
    'bg-[var(--danger)]',
    'bg-[var(--danger)]',
    'bg-[var(--warn)]',
    'bg-[var(--ok)]',
    'bg-[var(--ok)]',
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-lg font-semibold text-[var(--brand)]">
            MindBridge Echo
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Set a new password</h1>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          {checking ? (
            <p className="text-center text-sm text-[var(--muted)]">Checking your link…</p>
          ) : !hasSession ? (
            <div className="space-y-4">
              <Alert tone="warn">
                This reset link has expired or was already used. Please request a new one.
              </Alert>
              <Link
                href="/forgot-password"
                className="block text-center text-sm font-medium text-[var(--brand)] hover:underline"
              >
                Request a new reset link
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {error && <Alert tone="error">{error}</Alert>}
              <div>
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a new password"
                />
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1" aria-hidden>
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={cn(
                            'h-1.5 flex-1 rounded-full',
                            i < strength.score ? barColors[strength.score] : 'bg-[var(--border)]',
                          )}
                        />
                      ))}
                    </div>
                    <p
                      className={cn(
                        'mt-1 text-xs',
                        tooWeak ? 'text-[var(--danger)]' : 'text-[var(--muted)]',
                      )}
                    >
                      Password strength: {strength.label}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your new password"
                />
                {matchError && (
                  <p className="mt-1 text-xs text-[var(--danger)]">Passwords do not match.</p>
                )}
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading || matchError || tooWeak || !password || !confirm}
              >
                {loading ? 'Saving…' : 'Update password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
