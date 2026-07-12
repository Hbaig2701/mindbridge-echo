// Session review: the transcript as bubbles, distress/safety markers on the
// person's messages, any flags raised, and a feedback form that feeds the memory loop.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { Badge, Card } from '@/components/ui';
import { FeedbackForm } from '@/components/FeedbackForm';
import type { Assessment, Flag, Message, Session } from '@/lib/types';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function SessionReviewPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const supabase = await createServerClient();

  const { data: sessionRow } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  if (!sessionRow) notFound();
  const session = sessionRow as Session;

  const [{ data: messageRows }, { data: flagRows }] = await Promise.all([
    supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true }),
    supabase
      .from('flags')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true }),
  ]);

  const messages = (messageRows ?? []) as Message[];
  const flags = (flagRows ?? []) as Flag[];

  // Assessments join by message_id; RLS already scopes to this user.
  const messageIds = messages.map((m) => m.id);
  let assessmentsByMessage = new Map<string, Assessment>();
  if (messageIds.length > 0) {
    const { data: assessmentRows } = await supabase
      .from('assessments')
      .select('*')
      .in('message_id', messageIds);
    assessmentsByMessage = new Map(
      ((assessmentRows ?? []) as Assessment[]).map((a) => [a.message_id, a]),
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/caregiver/profiles/${id}`}
          className="text-sm text-[var(--brand)] hover:underline"
        >
          ← Back to profile
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Session review</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {fmtDate(session.started_at)} · {Math.round(session.respite_seconds / 60)} min respite
        </p>
      </div>

      {/* Flags raised in this session */}
      {flags.length > 0 && (
        <Card className="space-y-2">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Flags in this session</h2>
          <ul className="space-y-2">
            {flags.map((f) => (
              <li key={f.id} className="flex items-start gap-2 text-sm">
                <Badge
                  tone={
                    f.type === 'safety'
                      ? 'danger'
                      : f.type === 'medical' || f.type === 'care_need'
                        ? 'warn'
                        : 'neutral'
                  }
                >
                  {f.type === 'care_need' ? 'care need' : f.type}
                </Badge>
                <span className="text-[var(--muted)]">
                  {f.reason}
                  {f.resolved && <span className="ml-2 text-[var(--ok)]">(resolved)</span>}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Transcript */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Transcript</h2>
        {messages.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--muted)]">No messages were recorded in this session.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {messages
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((m) => {
                const isUser = m.role === 'user';
                const a = assessmentsByMessage.get(m.id);
                const showSafety = isUser && a?.safety_concern && a.safety_type !== 'none';
                const showDistress = isUser && a?.distress && a.distress_type !== 'none';
                return (
                  <div
                    key={m.id}
                    className={isUser ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                      <div
                        className={
                          isUser
                            ? 'rounded-2xl rounded-br-sm bg-[var(--brand)] px-4 py-2 text-sm text-[var(--brand-fg)]'
                            : 'rounded-2xl rounded-bl-sm border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm text-[var(--foreground)]'
                        }
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                      <div
                        className={`mt-1 flex flex-wrap items-center gap-2 ${
                          isUser ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span className="text-xs text-[var(--muted)]">
                          {isUser ? 'Care recipient' : 'Echo'} · {fmtDate(m.created_at)}
                        </span>
                        {showSafety && (
                          <Badge tone="danger">Safety: {a!.safety_type}</Badge>
                        )}
                        {showDistress && (
                          <Badge tone="warn">Distress: {a!.distress_type}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Feedback */}
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Rate this session</h2>
        <FeedbackForm sessionId={sessionId} profileId={id} />
      </Card>
    </div>
  );
}
