'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Alert, cn } from '@/components/ui';
import type { CaregiverType } from '@/lib/types';

const OPTIONS: { value: CaregiverType; title: string; blurb: string; icon: string }[] = [
  {
    value: 'family',
    title: 'Family caregiver',
    blurb: 'I care for a relative or friend living with dementia — at home or nearby.',
    icon: '🏡',
  },
  {
    value: 'professional',
    title: 'Professional caregiver',
    blurb: 'I am staff at an assisted-living or care facility, supporting residents.',
    icon: '🩺',
  },
];

export function RoleClient({ initial }: { initial: CaregiverType | null }) {
  const router = useRouter();
  const [selected, setSelected] = useState<CaregiverType | null>(initial);
  const [saving, setSaving] = useState<CaregiverType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(value: CaregiverType) {
    setSelected(value);
    setError(null);
    setSaving(value);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(null);
      setError('Your session expired. Please log in again.');
      return;
    }

    const { error: upsertError } = await supabase.from('consents').upsert({
      user_id: user.id,
      caregiver_type: value,
      agreed: false,
      version: process.env.NEXT_PUBLIC_CONSENT_VERSION,
    });

    if (upsertError) {
      setSaving(null);
      setError('We could not save that choice. Please try again.');
      return;
    }

    router.push('/onboarding/consent');
  }

  return (
    <div className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={saving !== null}
              onClick={() => choose(opt.value)}
              className={cn(
                'flex flex-col items-start rounded-xl border p-5 text-left transition-colors disabled:opacity-60',
                active
                  ? 'border-[var(--brand)] bg-[var(--brand-soft)]'
                  : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--brand)]',
              )}
            >
              <span className="text-3xl">{opt.icon}</span>
              <span className="mt-3 text-lg font-semibold text-[var(--foreground)]">{opt.title}</span>
              <span className="mt-1 text-sm text-[var(--muted)]">{opt.blurb}</span>
              {saving === opt.value && (
                <span className="mt-3 text-sm font-medium text-[var(--brand)]">Saving…</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
