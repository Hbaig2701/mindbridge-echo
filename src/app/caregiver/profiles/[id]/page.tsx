// Profile detail: hand-off point to the companion session, a readable life-story
// summary, recent sessions, and recent open flags.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { Badge, Button, Card } from '@/components/ui';
import { emptyLifeStory, type Flag, type LifeStory, type Profile, type Session } from '@/lib/types';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function TextSection({ title, body }: { title: string; body: string }) {
  if (!body?.trim()) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">{body}</p>
    </div>
  );
}

function ChipSection({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      <ul className="mt-1 flex flex-wrap gap-2">
        {items.map((v, i) => (
          <li
            key={`${v}-${i}`}
            className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-sm text-[var(--brand)]"
          >
            {v}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (!profileRow) notFound();
  const profile = profileRow as Profile;
  // A profile row can carry the DB default `{}` (or a partial object); merge over an
  // empty life story so nested access (story.background.*, story.work.*) never crashes.
  const story: LifeStory = { ...emptyLifeStory(), ...(profile.life_story ?? {}) };

  const [{ data: sessionRows }, { data: flagRows }] = await Promise.all([
    supabase
      .from('sessions')
      .select('*')
      .eq('profile_id', id)
      .eq('mode', 'care_recipient')
      .order('started_at', { ascending: false })
      .limit(15),
    supabase
      .from('flags')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false }),
  ]);

  const sessions = (sessionRows ?? []) as Session[];
  const allOpenFlags = (flagRows ?? []) as Flag[];
  // Scope open flags to this profile via its sessions.
  const sessionIds = new Set(sessions.map((s) => s.id));
  const profileFlags = allOpenFlags.filter(
    (f) => f.session_id != null && sessionIds.has(f.session_id),
  );

  return (
    <div className="space-y-8">
      <div>
        <Link href="/caregiver" className="text-sm text-[var(--brand)] hover:underline">
          ← Back to profiles
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">{profile.name}</h1>
          <div className="flex gap-2">
            <Link href={`/caregiver/profiles/${id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
            <Link href={`/caregiver/profiles/${id}/progress`}>
              <Button variant="secondary">Progress</Button>
            </Link>
          </div>
        </div>
        {profile.age != null && (
          <p className="mt-1 text-sm text-[var(--muted)]">Age {profile.age}</p>
        )}
      </div>

      {/* Companion hand-off */}
      <Card className="bg-[var(--brand-soft)]">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Companion session</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Hand this device to {profile.name} and let Echo keep them company.
        </p>
        <div className="mt-4">
          <Link href={`/companion/${id}`}>
            <Button size="lg">Start companion session</Button>
          </Link>
        </div>
      </Card>

      {/* Triggers & strategies */}
      {(profile.known_triggers.length > 0 || profile.known_calming_strategies.length > 0) && (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Triggers &amp; what helps</h2>
          <ChipSection title="Known triggers" items={profile.known_triggers} />
          <ChipSection title="Known calming strategies" items={profile.known_calming_strategies} />
        </Card>
      )}

      {/* Life story */}
      <Card className="space-y-5">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Life story</h2>
        <TextSection title="Birthplace" body={story.background.birthplace} />
        <TextSection title="Upbringing" body={story.background.upbringing} />
        <ChipSection title="Languages" items={story.background.languages} />

        {story.family.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Family</h3>
            <ul className="mt-2 space-y-2">
              {story.family.map((m, i) => (
                <li key={i} className="rounded-lg border border-[var(--border)] p-3 text-sm">
                  <span className="font-medium text-[var(--foreground)]">
                    {m.name || 'Unnamed'}
                  </span>
                  {m.relationship && (
                    <span className="text-[var(--muted)]"> · {m.relationship}</span>
                  )}
                  {m.notes && (
                    <p className="mt-1 whitespace-pre-wrap text-[var(--muted)]">{m.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <TextSection title="Occupation" body={story.work.occupation} />
        <TextSection title="Career notes" body={story.work.career_notes} />
        <ChipSection title="Interests" items={story.interests} />
        <ChipSection title="Music" items={story.music} />
        <ChipSection title="Comfort topics" items={story.comfort_topics} />
        <ChipSection title="Key people" items={story.key_people} />
        <ChipSection title="Important places" items={story.important_places} />
        <ChipSection title="Routines" items={story.routines} />
        <TextSection title="Communication notes" body={story.communication_notes} />
      </Card>

      {/* Recent sessions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Recent sessions</h2>
        {sessions.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--muted)]">
              No companion sessions yet. Start one above to begin.
            </p>
          </Card>
        ) : (
          <Card className="divide-y divide-[var(--border)] p-0">
            {sessions.map((s) => (
              <Link
                key={s.id}
                href={`/caregiver/profiles/${id}/sessions/${s.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-black/5"
              >
                <span className="text-sm text-[var(--foreground)]">{fmtDate(s.started_at)}</span>
                <span className="flex items-center gap-3">
                  <span className="text-sm text-[var(--muted)]">
                    {Math.round(s.respite_seconds / 60)} min respite
                  </span>
                  <span className="text-sm font-medium text-[var(--brand)]">Review →</span>
                </span>
              </Link>
            ))}
          </Card>
        )}
      </div>

      {/* Recent open flags for this profile */}
      {profileFlags.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Recent flags</h2>
          <Card className="space-y-3">
            {profileFlags.slice(0, 5).map((f) => (
              <div key={f.id} className="flex items-start justify-between gap-3">
                <div>
                  <Badge tone={f.type === 'safety' ? 'danger' : f.type === 'medical' ? 'warn' : 'neutral'}>
                    {f.type}
                  </Badge>
                  <p className="mt-1 text-sm text-[var(--muted)]">{f.reason}</p>
                </div>
                {f.session_id && (
                  <Link
                    href={`/caregiver/profiles/${id}/sessions/${f.session_id}`}
                    className="whitespace-nowrap text-sm font-medium text-[var(--brand)]"
                  >
                    View →
                  </Link>
                )}
              </div>
            ))}
            <Link href="/caregiver/flags" className="block text-sm font-medium text-[var(--brand)]">
              All flags →
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
}
