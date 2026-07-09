'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Label, Alert, cn } from '@/components/ui';

// Lightweight, dependency-free strength heuristic (0-4).
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

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = useMemo(() => scorePassword(password), [password]);
  const matchError = confirm.length > 0 && confirm !== password;
  const tooWeak = password.length > 0 && strength.score < 2;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (strength.score < 2) {
      setError('Please choose a stronger password (at least 8 characters, mixing letters and numbers).');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });

    if (signUpError) {
      setLoading(false);
      // Keep this generic so we don't leak whether an account already exists.
      setError('We could not create your account. Please check your details and try again.');
      return;
    }

    // Never persist the raw password. Only the email is carried forward.
    router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
  }

  const barColors = [
    'bg-[var(--danger)]',
    'bg-[var(--danger)]',
    'bg-[var(--warn)]',
    'bg-[var(--ok)]',
    'bg-[var(--ok)]',
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}

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
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
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
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter your password"
        />
        {matchError && <p className="mt-1 text-xs text-[var(--danger)]">Passwords do not match.</p>}
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={loading || matchError || tooWeak || !password || !confirm}
      >
        {loading ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-[var(--muted)]">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-[var(--brand)] hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
