'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await createClient().auth.signOut();
        router.push('/login');
        router.refresh();
      }}
      className={className ?? 'text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]'}
    >
      Log out
    </button>
  );
}
