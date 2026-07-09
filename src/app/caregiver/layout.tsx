// Caregiver-mode shell. A distinct header (teal brand) makes the mode unambiguous
// vs. the warm care-recipient mode. Gates onboarding: unconsented users are sent
// into the onboarding flow.

import Link from 'next/link';
import { requireOnboardedUser } from '@/lib/auth';
import { SignOutButton } from '@/components/SignOutButton';

export default async function CaregiverLayout({ children }: { children: React.ReactNode }) {
  await requireOnboardedUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--brand)] text-[var(--brand-fg)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link href="/caregiver" className="flex items-center gap-2 font-semibold">
            MindBridge Echo
            <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-medium">Caregiver</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/caregiver" className="hover:underline">
              Profiles
            </Link>
            <Link href="/caregiver/flags" className="hover:underline">
              Flags
            </Link>
            <Link href="/caregiver/account" className="hover:underline">
              Account
            </Link>
            <SignOutButton className="text-sm font-medium text-white/80 hover:text-white" />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}
