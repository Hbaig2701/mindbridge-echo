'use client';

// Caregiver session feedback. A 1–5 score plus an optional verbal note (dictatable).
// Scoring feeds the memory loop: /api/feedback derives what worked / didn't work for
// this person so Echo adapts next time.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Label, Textarea } from '@/components/ui';
import { MicButton } from '@/components/MicButton';

export function FeedbackForm({
  sessionId,
  profileId,
}: {
  sessionId: string;
  profileId: string;
}) {
  const router = useRouter();
  const [score, setScore] = useState<number>(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // profileId is accepted for a stable call signature across callers; the API
  // resolves the profile from the session server-side.
  void profileId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (score < 1 || score > 5) {
      setError('Please choose a score from 1 to 5.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, score, verbalNote: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Could not save your feedback. Please try again.');
        setSaving(false);
        return;
      }
      setDone(true);
      setSaving(false);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  if (done) {
    return (
      <Alert tone="success">
        Thank you — your rating has been saved. Echo uses this to learn what works for this
        person.
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        How well did this session go? Your score teaches Echo what works for this person — the
        memory loop that shapes future conversations.
      </p>

      <div>
        <Label>Session score</Label>
        <div className="flex items-center gap-2" role="radiogroup" aria-label="Session score">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={score === n}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              onClick={() => setScore(n)}
              className={`flex h-11 w-11 items-center justify-center rounded-lg border text-lg transition-colors ${
                n <= score
                  ? 'border-transparent bg-[var(--brand)] text-[var(--brand-fg)]'
                  : 'border-[var(--border)] bg-white text-[var(--muted)] hover:bg-black/5'
              }`}
            >
              {n <= score ? '★' : '☆'}
            </button>
          ))}
          {score > 0 && (
            <span className="ml-2 text-sm text-[var(--muted)]">{score} / 5</span>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <Label className="mb-0" htmlFor="fb-note">
            Verbal note (optional)
          </Label>
          <MicButton
            size="sm"
            idleLabel="Dictate"
            onTranscript={(text) => setNote((prev) => (prev ? `${prev} ${text}` : text))}
          />
        </div>
        <Textarea
          id="fb-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What worked, what didn't, anything to try next time…"
        />
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save feedback'}
      </Button>
    </form>
  );
}

export default FeedbackForm;
