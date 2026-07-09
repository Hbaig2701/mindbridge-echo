'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Label, Alert } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });
    // Neutral confirmation regardless of whether the email exists.
    setLoading(false);
    setSent(true);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-lg font-semibold text-[var(--brand)]">
            MindBridge Echo
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Reset your password</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Enter your email and we&apos;ll send you a link to set a new password.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          {sent ? (
            <div className="space-y-4">
              <Alert tone="success">
                If an account exists for that email, we&apos;ve sent a password reset link. Check your
                inbox (and spam folder).
              </Alert>
              <Link href="/login" className="block text-center text-sm font-medium text-[var(--brand)] hover:underline">
                Back to log in
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
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
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
              <p className="text-center text-sm text-[var(--muted)]">
                <Link href="/login" className="font-medium text-[var(--brand)] hover:underline">
                  Back to log in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
