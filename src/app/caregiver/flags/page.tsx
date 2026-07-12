// Flags inbox: every open flag across all profiles, with the triggering message,
// which person it concerns, and a link into the session for full context.

import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { Badge, Card } from '@/components/ui';
import { ResolveFlagButton } from '@/components/ResolveFlagButton';
import type { Flag, FlagType, Message, Session } from '@/lib/types';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function toneFor(type: FlagType): 'danger' | 'warn' | 'neutral' {
  if (type === 'safety') return 'danger';
  if (type === 'medical' || type === 'care_need') return 'warn';
  return 'neutral';
}

function flagLabel(type: FlagType): string {
  return type === 'care_need' ? 'care need' : type;
}

export default async function FlagsInboxPage() {
  const supabase = await createServerClient();

  const { data: flagRows } = await supabase
    .from('flags')
    .select('*')
    .eq('resolved', false)
    .order('created_at', { ascending: false });
  const flags = (flagRows ?? []) as Flag[];

  // Batch-load the triggering messages and the owning sessions/profiles, then map
  // in memory. RLS scopes everything to this user.
  const messageIds = [...new Set(flags.map((f) => f.message_id).filter(Boolean))] as string[];
  const sessionIds = [...new Set(flags.map((f) => f.session_id).filter(Boolean))] as string[];

  const [messagesRes, sessionsRes] = await Promise.all([
    messageIds.length
      ? supabase.from('messages').select('id, content').in('id', messageIds)
      : Promise.resolve({ data: [] as Pick<Message, 'id' | 'content'>[] }),
    sessionIds.length
      ? supabase.from('sessions').select('id, profile_id').in('id', sessionIds)
      : Promise.resolve({ data: [] as Pick<Session, 'id' | 'profile_id'>[] }),
  ]);

  const messageById = new Map(
    ((messagesRes.data ?? []) as Pick<Message, 'id' | 'content'>[]).map((m) => [m.id, m.content]),
  );
  const sessions = (sessionsRes.data ?? []) as Pick<Session, 'id' | 'profile_id'>[];
  const profileIdBySession = new Map(sessions.map((s) => [s.id, s.profile_id]));

  const profileIds = [...new Set(sessions.map((s) => s.profile_id))];
  const profileNameById = new Map<string, string>();
  if (profileIds.length) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', profileIds);
    for (const p of (profileRows ?? []) as { id: string; name: string }[]) {
      profileNameById.set(p.id, p.name);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Flags</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Moments where Echo stepped back for a human. Review each one and mark it resolved once
          you&apos;ve handled it.
        </p>
      </div>

      {flags.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm text-[var(--muted)]">All clear — no open flags.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {flags.map((f) => {
            const profileId = f.session_id ? profileIdBySession.get(f.session_id) : undefined;
            const profileName = profileId ? profileNameById.get(profileId) : undefined;
            const triggerText = f.message_id ? messageById.get(f.message_id) : undefined;
            return (
              <Card key={f.id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={toneFor(f.type)}>{flagLabel(f.type)}</Badge>
                    {profileName && (
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {profileName}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--muted)]">{fmtDate(f.created_at)}</span>
                </div>

                <p className="text-sm text-[var(--foreground)]">{f.reason}</p>

                {triggerText && (
                  <blockquote className="border-l-2 border-[var(--border)] pl-3 text-sm italic text-[var(--muted)]">
                    “{triggerText}”
                  </blockquote>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  {f.session_id && profileId ? (
                    <Link
                      href={`/caregiver/profiles/${profileId}/sessions/${f.session_id}`}
                      className="text-sm font-medium text-[var(--brand)] hover:underline"
                    >
                      View session →
                    </Link>
                  ) : (
                    <span />
                  )}
                  <ResolveFlagButton id={f.id} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
