// Edit an existing profile.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { ProfileForm } from '@/components/ProfileForm';
import type { Profile } from '@/lib/types';

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single();

  if (!profile) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/caregiver/profiles/${id}`}
          className="text-sm text-[var(--brand)] hover:underline"
        >
          ← Back to profile
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
          Edit {(profile as Profile).name}
        </h1>
      </div>
      <ProfileForm
        initial={profile as Profile}
        redirectTo={`/caregiver/profiles/${id}`}
        submitLabel="Save changes"
      />
    </div>
  );
}
