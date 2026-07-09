import { requireUser } from '@/lib/auth';
import { ProfileForm } from '@/components/ProfileForm';

export default async function OnboardingProfilePage() {
  await requireUser();

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">Step 3 of 3</p>
      <h1 className="mt-3 text-3xl font-bold">Create your first profile</h1>
      <p className="mt-2 text-[var(--muted)]">
        Tell Echo about the person you care for so conversations feel familiar and warm. A reminder:
        please use <strong>fictional or de-identified details</strong> — no real names or identifiers.
      </p>

      <div className="mt-8">
        <ProfileForm redirectTo="/caregiver" submitLabel="Create profile & continue" />
      </div>
    </main>
  );
}
