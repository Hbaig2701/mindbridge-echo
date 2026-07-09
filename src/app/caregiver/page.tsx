// Caregiver dashboard: the people you care for, plus a nudge toward open flags.

import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { Badge, Button, Card } from '@/components/ui';
import type { Flag, Profile } from '@/lib/types';

export default async function CaregiverDashboard() {
  const supabase = await createServerClient();

  const [{ data: profileRows }, { data: flagRows }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at'),
    supabase.from('flags').select('id').eq('resolved', false),
  ]);

  const profiles = (profileRows ?? []) as Profile[];
  const openFlags = (flagRows ?? []) as Pick<Flag, 'id'>[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Your people</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Each profile is a life story that shapes how Echo talks with the person you care for.
          </p>
        </div>
        <Link href="/caregiver/profiles/new">
          <Button size="lg">Add a profile</Button>
        </Link>
      </div>

      {openFlags.length > 0 && (
        <Link href="/caregiver/flags" className="block">
          <Card className="flex items-center justify-between gap-3 border-[var(--warn)]/40 bg-amber-50/60 hover:shadow-md">
            <span className="flex items-center gap-3 text-sm text-[var(--foreground)]">
              <Badge tone="warn">{openFlags.length} open</Badge>
              {openFlags.length === 1 ? 'flag needs' : 'flags need'} your attention
            </span>
            <span className="text-sm font-medium text-[var(--brand)]">Review flags →</span>
          </Card>
        </Link>
      )}

      {profiles.length === 0 ? (
        <Card className="text-center">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Let&apos;s create your first profile
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
            Tell Echo about the person you care for — their history, the people and places they
            love, and what helps them feel calm. The more you share, the warmer and more familiar
            Echo can be.
          </p>
          <div className="mt-5">
            <Link href="/caregiver/profiles/new">
              <Button size="lg">Add a profile</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {profiles.map((p) => (
            <Link key={p.id} href={`/caregiver/profiles/${p.id}`} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">{p.name}</h2>
                  {p.age != null && (
                    <span className="text-sm text-[var(--muted)]">Age {p.age}</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                  {p.known_triggers.length > 0 && (
                    <Badge tone="neutral">{p.known_triggers.length} triggers</Badge>
                  )}
                  {p.known_calming_strategies.length > 0 && (
                    <Badge tone="ok">{p.known_calming_strategies.length} calming strategies</Badge>
                  )}
                  {p.life_story?.family?.length > 0 && (
                    <Badge tone="neutral">{p.life_story.family.length} family</Badge>
                  )}
                </div>
                <p className="mt-4 text-sm font-medium text-[var(--brand)]">Open profile →</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
