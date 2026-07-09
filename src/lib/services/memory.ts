// MemoryService — the store-and-reuse learning loop.
//  - deriveFromFeedback(): after a session, turn a caregiver score + note into
//    memory_entries (score>=4 => worked, <=2 => didnt_work, note => caregiver_note).
//  - retrieveForPrompt(): compact "prefer these / avoid these / follow this" block
//    injected into the companion prompt (6.1).
// Boundary: store-and-reuse only. We do NOT auto-parse notes into behavior rules.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MemoryEntry } from '@/lib/types';

interface DeriveArgs {
  userId: string;
  profileId: string;
  sessionId: string;
  score: number;
  verbalNote?: string | null;
}

export const MemoryService = {
  async deriveFromFeedback(
    db: SupabaseClient,
    { userId, profileId, sessionId, score, verbalNote }: DeriveArgs,
  ): Promise<void> {
    const rows: Array<Pick<MemoryEntry, 'kind' | 'content' | 'score'>> = [];

    // Summarize what happened in the session so "worked/didnt_work" has content.
    const summary = await sessionSummary(db, sessionId);

    if (score >= 4) {
      rows.push({ kind: 'worked', content: summary, score });
    } else if (score <= 2) {
      rows.push({ kind: 'didnt_work', content: summary, score });
    }

    const note = (verbalNote ?? '').trim();
    if (note) {
      rows.push({ kind: 'caregiver_note', content: note, score: null });
    }

    if (rows.length === 0) return;

    await db.from('memory_entries').insert(
      rows.map((r) => ({
        user_id: userId,
        profile_id: profileId,
        session_id: sessionId,
        kind: r.kind,
        content: r.content,
        score: r.score,
      })),
    );
  },

  /** Compact guidance block for the companion prompt. Most recent first. */
  async retrieveForPrompt(db: SupabaseClient, profileId: string): Promise<string> {
    const { data } = await db
      .from('memory_entries')
      .select('kind, content, score, created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(30);

    const entries = (data ?? []) as Pick<MemoryEntry, 'kind' | 'content' | 'score'>[];
    if (entries.length === 0) return '';

    const worked = entries.filter((e) => e.kind === 'worked').slice(0, 5);
    const didnt = entries.filter((e) => e.kind === 'didnt_work').slice(0, 5);
    const notes = entries.filter((e) => e.kind === 'caregiver_note').slice(0, 8);

    const parts: string[] = [];
    if (worked.length)
      parts.push(`PREFER approaches like these (they worked):\n${worked.map((e) => `- ${e.content}`).join('\n')}`);
    if (didnt.length)
      parts.push(`AVOID approaches like these (they did not work):\n${didnt.map((e) => `- ${e.content}`).join('\n')}`);
    if (notes.length)
      parts.push(`FOLLOW the caregiver's guidance:\n${notes.map((e) => `- ${e.content}`).join('\n')}`);

    return parts.join('\n\n');
  },
};

async function sessionSummary(db: SupabaseClient, sessionId: string): Promise<string> {
  const { data } = await db
    .from('messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(20);

  const rows = (data ?? []) as { role: string; content: string }[];
  const topics = rows
    .filter((r) => r.role === 'assistant')
    .map((r) => r.content)
    .slice(0, 3)
    .join(' ');
  return topics
    ? `A conversation that included: ${truncate(topics, 300)}`
    : 'A companion conversation session.';
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
