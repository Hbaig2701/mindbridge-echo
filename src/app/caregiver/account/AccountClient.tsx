'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, Input, Label, Alert, cn } from '@/components/ui';

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

function ChangePassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const strength = useMemo(() => scorePassword(password), [password]);
  const matchError = confirm.length > 0 && confirm !== password;
  const tooWeak = password.length > 0 && strength.score < 2;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (strength.score < 2) {
      setError('Please choose a stronger password.');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError('We could not update your password. Please try again.');
      return;
    }
    setPassword('');
    setConfirm('');
    setDone(true);
  }

  const barColors = [
    'bg-[var(--danger)]',
    'bg-[var(--danger)]',
    'bg-[var(--warn)]',
    'bg-[var(--ok)]',
    'bg-[var(--ok)]',
  ];

  return (
    <Card>
      <h2 className="text-lg font-semibold">Change password</h2>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        {done && <Alert tone="success">Your password has been updated.</Alert>}
        <div>
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
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
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your new password"
          />
          {matchError && <p className="mt-1 text-xs text-[var(--danger)]">Passwords do not match.</p>}
        </div>
        <Button type="submit" disabled={saving || matchError || tooWeak || !password || !confirm}>
          {saving ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </Card>
  );
}

function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) throw new Error('failed');
      window.location.href = '/';
    } catch {
      setDeleting(false);
      setError('We could not delete your account. Please try again.');
    }
  }

  return (
    <Card className="border-[var(--danger)]/40">
      <h2 className="text-lg font-semibold text-[var(--danger)]">Delete account &amp; data</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        This permanently deletes your account and <strong>all</strong> associated data — every
        profile you created, all companion conversations, safety and quality signals, progress logs,
        and feedback. This cascade cannot be undone.
      </p>

      {error && (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {!confirming ? (
        <div className="mt-4">
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Delete my account and data
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3 rounded-lg bg-[var(--danger-soft)] p-4">
          <p className="text-sm font-medium text-[var(--danger)]">
            Are you sure? This will erase everything and cannot be undone.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" onClick={onDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Yes, permanently delete'}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={deleting}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function AccountClient() {
  return (
    <div className="space-y-6">
      <ChangePassword />
      <DeleteAccount />
    </div>
  );
}
