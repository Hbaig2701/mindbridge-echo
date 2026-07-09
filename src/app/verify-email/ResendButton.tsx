'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button, Alert } from '@/components/ui';

export function ResendButton({ email }: { email: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function onResend() {
    if (!email) return;
    setStatus('sending');
    const supabase = createClient();
    await supabase.auth.resend({ type: 'signup', email });
    // Always show success regardless — don't leak account existence.
    setStatus('sent');
  }

  return (
    <div className="space-y-3">
      {status === 'sent' && (
        <Alert tone="success">If that address needs confirming, a new link is on its way.</Alert>
      )}
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={onResend}
        disabled={status === 'sending' || !email}
      >
        {status === 'sending' ? 'Sending…' : 'Resend verification email'}
      </Button>
    </div>
  );
}
