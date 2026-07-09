import { notFound } from 'next/navigation';
import { requireOnboardedUser } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CompanionClient } from './CompanionClient';
import type { Profile } from '@/lib/types';

export default async function CompanionPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  await requireOnboardedUser();
  const { profileId } = await params;

  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (!profile) notFound();

  return <CompanionClient profile={profile as Profile} />;
}
