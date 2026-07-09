'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Alert } from '@/components/ui';
import type { CaregiverType } from '@/lib/types';

export function ConsentClient({ caregiverType }: { caregiverType: CaregiverType | null }) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onContinue() {
    if (!agreed) return;
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError('Your session expired. Please log in again.');
      return;
    }

    const { error: upsertError } = await supabase.from('consents').upsert({
      user_id: user.id,
      caregiver_type: caregiverType, // preserve the role chosen in the previous step
      agreed: true,
      version: process.env.NEXT_PUBLIC_CONSENT_VERSION,
    });

    if (upsertError) {
      setSaving(false);
      setError('We could not record your consent. Please try again.');
      return;
    }

    router.push('/onboarding/profile');
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-4">
      {error && <Alert tone="error">{error}</Alert>}

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 h-5 w-5 flex-shrink-0 accent-[var(--brand)]"
        />
        <span className="text-sm text-[var(--foreground)]">
          I understand and agree. I&apos;ve read the above, I know this is a research pilot and not a
          medical device or emergency service, and I will use fictional or de-identified details for
          any profile I create.
        </span>
      </label>

      <Button size="lg" className="w-full sm:w-auto" onClick={onContinue} disabled={!agreed || saving}>
        {saving ? 'Saving…' : 'Agree and continue'}
      </Button>
    </div>
  );
}
