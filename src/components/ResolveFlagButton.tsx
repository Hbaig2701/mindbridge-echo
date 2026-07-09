'use client';

// Marks a caregiver flag resolved, then refreshes the inbox.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

export function ResolveFlagButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function resolve() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch('/api/flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, resolved: true }),
      });
      if (!res.ok) {
        setError(true);
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="secondary" onClick={resolve} disabled={busy}>
        {busy ? 'Resolving…' : 'Mark resolved'}
      </Button>
      {error && <span className="text-sm text-[var(--danger)]">Couldn&apos;t resolve — retry.</span>}
    </div>
  );
}

export default ResolveFlagButton;
