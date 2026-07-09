import { redirect } from 'next/navigation';
import { requireUser, getConsent } from '@/lib/auth';
import { RoleClient } from './RoleClient';

export default async function RolePage() {
  const user = await requireUser();
  const consent = await getConsent(user.id);
  if (consent?.agreed) redirect('/caregiver');

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">Step 1 of 3</p>
      <h1 className="mt-3 text-3xl font-bold">I am a…</h1>
      <p className="mt-2 text-[var(--muted)]">
        This helps us tailor Echo to how you care. You can only pick one for now.
      </p>

      <div className="mt-8">
        <RoleClient initial={consent?.caregiver_type ?? null} />
      </div>
    </main>
  );
}
