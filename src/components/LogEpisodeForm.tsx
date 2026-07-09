'use client';

// Quick "log an episode" action for caregivers. Posts to /api/progress and
// refreshes the page so the charts pick up the new data point.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Label, Input, Textarea, cn } from '@/components/ui';
import { MicButton } from '@/components/MicButton';

export function LogEpisodeForm({
  profileId,
  sessionId,
}: {
  profileId: string;
  sessionId?: string;
}) {
  const router = useRouter();
  const [agitationEpisode, setAgitationEpisode] = useState(false);
  const [timeToCalm, setTimeToCalm] = useState('');
  const [respite, setRespite] = useState('');
  const [helpful, setHelpful] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setAgitationEpisode(false);
    setTimeToCalm('');
    setRespite('');
    setHelpful(null);
    setNote('');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError(null);
    setSaved(false);

    const toNum = (v: string): number | undefined => {
      const t = v.trim();
      if (!t) return undefined;
      const n = Number(t);
      return Number.isFinite(n) ? n : undefined;
    };

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          sessionId,
          agitationEpisode,
          timeToCalmMin: toNum(timeToCalm),
          respiteMin: toNum(respite),
          companionHelpful: helpful ?? undefined,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not save the entry.');
      }
      reset();
      setStatus('idle');
      setSaved(true);
      router.refresh();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not save the entry.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {saved && status === 'idle' && (
        <Alert tone="success">Saved. Your charts have been updated.</Alert>
      )}
      {status === 'error' && error && <Alert tone="error">{error}</Alert>}

      <label className="flex items-center gap-3 text-sm font-medium text-[var(--foreground)]">
        <input
          type="checkbox"
          checked={agitationEpisode}
          onChange={(e) => setAgitationEpisode(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--border)] accent-[var(--brand)]"
        />
        An agitation episode occurred
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ttc">Time to calm (min)</Label>
          <Input
            id="ttc"
            type="number"
            min={0}
            inputMode="numeric"
            value={timeToCalm}
            onChange={(e) => setTimeToCalm(e.target.value)}
            placeholder="e.g. 8"
          />
        </div>
        <div>
          <Label htmlFor="respite">Respite (min)</Label>
          <Input
            id="respite"
            type="number"
            min={0}
            inputMode="numeric"
            value={respite}
            onChange={(e) => setRespite(e.target.value)}
            placeholder="e.g. 20"
          />
        </div>
      </div>

      <div>
        <Label>Did the companion help?</Label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={helpful === n}
              onClick={() => setHelpful(helpful === n ? null : n)}
              className={cn(
                'h-10 w-10 rounded-lg border text-sm font-medium transition-colors',
                helpful === n
                  ? 'border-transparent bg-[var(--brand)] text-[var(--brand-fg)]'
                  : 'border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-black/5',
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">1 = not at all, 5 = a great deal</p>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <Label htmlFor="note" className="mb-0">
            Note
          </Label>
          <MicButton size="sm" onTranscript={(t) => setNote((prev) => (prev ? `${prev} ${t}` : t))} />
        </div>
        <Textarea
          id="note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What happened, what helped…"
        />
      </div>

      <Button type="submit" disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving…' : 'Log episode'}
      </Button>
    </form>
  );
}
