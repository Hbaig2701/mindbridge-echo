import { requireUser, getConsent } from '@/lib/auth';
import { Card } from '@/components/ui';
import { AccountClient } from './AccountClient';

const CAREGIVER_LABELS: Record<string, string> = {
  family: 'Family caregiver',
  professional: 'Professional caregiver',
};

// Note: /caregiver/* is already gated by the caregiver layout (requireOnboardedUser).
// We only need the user here to display their basics — no extra onboarding gate.
export default async function AccountPage() {
  const user = await requireUser();
  const consent = await getConsent(user.id);
  const caregiverLabel = consent?.caregiver_type
    ? CAREGIVER_LABELS[consent.caregiver_type]
    : 'Not set';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Manage your sign-in and your data.</p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">Your details</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">Email</dt>
            <dd className="font-medium text-[var(--foreground)]">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">Caregiver type</dt>
            <dd className="font-medium text-[var(--foreground)]">{caregiverLabel}</dd>
          </div>
        </dl>
      </Card>

      <AccountClient />
    </div>
  );
}
