// Create a new care-recipient profile.

import Link from 'next/link';
import { ProfileForm } from '@/components/ProfileForm';

export default function NewProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/caregiver" className="text-sm text-[var(--brand)] hover:underline">
          ← Back to profiles
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Add a profile</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          Share as much or as little as you like — you can always come back and add more. Anything
          you tell Echo here helps it talk with the person in a way that feels familiar and kind.
          Tap the microphone on any longer field to dictate instead of typing.
        </p>
      </div>
      <ProfileForm redirectTo="/caregiver" submitLabel="Save profile" />
    </div>
  );
}
