// ProgressService — aggregates auto-captured + caregiver-logged data into the
// trends and summary the caregiver sees, plus a CSV export for the grant application.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProgressLog, Session } from '@/lib/types';

export interface ProgressPoint {
  date: string; // YYYY-MM-DD
  agitationEpisodes: number;
  avgTimeToCalm: number | null;
  respiteMin: number;
  sessions: number;
}

export interface ProgressSummary {
  totalSessions: number;
  totalRespiteMin: number;
  totalRespiteHrs: number;
  agitationEpisodes: number;
  avgTimeToCalmFirst: number | null; // earliest week average
  avgTimeToCalmLast: number | null; // latest week average
  avgCompanionHelpful: number | null;
  series: ProgressPoint[];
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export const ProgressService = {
  async summary(db: SupabaseClient, profileId: string): Promise<ProgressSummary> {
    const [{ data: sessionRows }, { data: logRows }] = await Promise.all([
      db
        .from('sessions')
        .select('id, respite_seconds, started_at, mode')
        .eq('profile_id', profileId)
        .eq('mode', 'care_recipient')
        .order('started_at', { ascending: true }),
      db
        .from('progress_logs')
        .select('logged_at, agitation_episode, time_to_calm_min, respite_min, companion_helpful')
        .eq('profile_id', profileId)
        .order('logged_at', { ascending: true }),
    ]);

    const sessions = (sessionRows ?? []) as Pick<Session, 'id' | 'respite_seconds' | 'started_at' | 'mode'>[];
    const logs = (logRows ?? []) as Pick<
      ProgressLog,
      'logged_at' | 'agitation_episode' | 'time_to_calm_min' | 'respite_min' | 'companion_helpful'
    >[];

    // Build per-day buckets.
    const byDay = new Map<string, ProgressPoint>();
    const bucket = (date: string): ProgressPoint => {
      let p = byDay.get(date);
      if (!p) {
        p = { date, agitationEpisodes: 0, avgTimeToCalm: null, respiteMin: 0, sessions: 0 };
        byDay.set(date, p);
      }
      return p;
    };
    // Track time-to-calm sums separately to compute averages.
    const calmSums = new Map<string, { sum: number; n: number }>();

    for (const s of sessions) {
      const b = bucket(dayKey(s.started_at));
      b.sessions += 1;
      b.respiteMin += (s.respite_seconds ?? 0) / 60;
    }

    for (const l of logs) {
      const day = dayKey(l.logged_at);
      const b = bucket(day);
      if (l.agitation_episode) b.agitationEpisodes += 1;
      if (l.respite_min) b.respiteMin += l.respite_min;
      if (l.time_to_calm_min != null) {
        const c = calmSums.get(day) ?? { sum: 0, n: 0 };
        c.sum += Number(l.time_to_calm_min);
        c.n += 1;
        calmSums.set(day, c);
      }
    }

    for (const [day, c] of calmSums) {
      const b = byDay.get(day)!;
      b.avgTimeToCalm = c.n ? Math.round((c.sum / c.n) * 10) / 10 : null;
    }

    const series = [...byDay.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => ({ ...p, respiteMin: Math.round(p.respiteMin * 10) / 10 }));

    const totalRespiteMin = series.reduce((sum, p) => sum + p.respiteMin, 0);
    const agitationEpisodes = series.reduce((sum, p) => sum + p.agitationEpisodes, 0);

    const calmPoints = series.filter((p) => p.avgTimeToCalm != null);
    const helpfulValues = logs
      .map((l) => l.companion_helpful)
      .filter((v): v is number => v != null);

    return {
      totalSessions: sessions.length,
      totalRespiteMin: Math.round(totalRespiteMin),
      totalRespiteHrs: Math.round((totalRespiteMin / 60) * 10) / 10,
      agitationEpisodes,
      avgTimeToCalmFirst: calmPoints.length ? calmPoints[0].avgTimeToCalm : null,
      avgTimeToCalmLast: calmPoints.length ? calmPoints[calmPoints.length - 1].avgTimeToCalm : null,
      avgCompanionHelpful: helpfulValues.length
        ? Math.round((helpfulValues.reduce((a, b) => a + b, 0) / helpfulValues.length) * 10) / 10
        : null,
      series,
    };
  },

  /** CSV of a profile's care-recipient sessions + progress logs. */
  async exportCsv(db: SupabaseClient, profileId: string): Promise<string> {
    const [{ data: sessionRows }, { data: logRows }] = await Promise.all([
      db
        .from('sessions')
        .select('id, mode, started_at, ended_at, respite_seconds')
        .eq('profile_id', profileId)
        .order('started_at', { ascending: true }),
      db
        .from('progress_logs')
        .select('logged_at, source, agitation_episode, time_to_calm_min, respite_min, companion_helpful, note, session_id')
        .eq('profile_id', profileId)
        .order('logged_at', { ascending: true }),
    ]);

    const lines: string[] = [];
    lines.push('record_type,timestamp,session_id,mode,ended_at,respite_seconds,source,agitation_episode,time_to_calm_min,respite_min,companion_helpful,note');

    for (const s of (sessionRows ?? []) as Session[]) {
      lines.push(
        [
          'session',
          s.started_at,
          s.id,
          s.mode,
          s.ended_at ?? '',
          String(s.respite_seconds ?? ''),
          '',
          '',
          '',
          '',
          '',
          '',
        ]
          .map(csvCell)
          .join(','),
      );
    }

    for (const l of (logRows ?? []) as (ProgressLog & { session_id: string | null })[]) {
      lines.push(
        [
          'progress_log',
          l.logged_at,
          l.session_id ?? '',
          '',
          '',
          '',
          l.source,
          String(l.agitation_episode),
          l.time_to_calm_min ?? '',
          l.respite_min ?? '',
          l.companion_helpful ?? '',
          l.note ?? '',
        ]
          .map(csvCell)
          .join(','),
      );
    }

    return lines.join('\n');
  },
};

function csvCell(value: string | number): string {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
