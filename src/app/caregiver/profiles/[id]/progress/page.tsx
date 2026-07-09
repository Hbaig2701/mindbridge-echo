// Progress-tracking dashboard for one care-recipient profile.
// Server component: loads the profile + aggregated ProgressSummary, then renders
// the summary card, charts, an episode-logging form and the grant CSV export.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { ProgressService } from '@/lib/services/progress';
import type { Profile } from '@/lib/types';
import { Card } from '@/components/ui';
import { ProgressCharts } from '@/components/ProgressCharts';
import { LogEpisodeForm } from '@/components/LogEpisodeForm';
import { ExportCsvButton } from '@/components/ExportCsvButton';

export default async function ProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();

  if (!profileRow) notFound();
  const profile = profileRow as Pick<Profile, 'id' | 'name'>;

  const summary = await ProgressService.summary(supabase, id);

  const hasData = summary.totalSessions > 0 || summary.series.length > 0;
  const hasTrend =
    summary.avgTimeToCalmFirst != null && summary.avgTimeToCalmLast != null;
  const trendDown =
    hasTrend && summary.avgTimeToCalmLast! < summary.avgTimeToCalmFirst!;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/caregiver/profiles/${id}`}
          className="text-sm text-[var(--brand)] hover:underline"
        >
          &larr; Back to {profile.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Progress</h1>
        <p className="text-sm text-[var(--muted)]">
          Trends across companion sessions and your logged notes.
        </p>
      </div>

      {/* Summary card */}
      <Card>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--foreground)]">
          <SummaryStat value={summary.totalSessions} label={summary.totalSessions === 1 ? 'session' : 'sessions'} />
          <Dot />
          <SummaryStat value={summary.totalRespiteHrs} label="hrs respite" />
          <Dot />
          <SummaryStat
            value={summary.agitationEpisodes}
            label={summary.agitationEpisodes === 1 ? 'agitation episode' : 'agitation episodes'}
          />
          {hasTrend && (
            <>
              <Dot />
              <span>
                avg time-to-calm{' '}
                <span
                  className={
                    trendDown ? 'font-semibold text-[var(--ok)]' : 'font-semibold text-[var(--warn)]'
                  }
                >
                  {trendDown ? '↓' : '↑'} from {summary.avgTimeToCalmFirst}→{summary.avgTimeToCalmLast} min
                </span>
              </span>
            </>
          )}
          {summary.avgCompanionHelpful != null && (
            <>
              <Dot />
              <SummaryStat value={summary.avgCompanionHelpful} label="avg companion helpfulness (1–5)" />
            </>
          )}
        </div>
      </Card>

      {!hasData ? (
        <Card>
          <p className="text-sm text-[var(--foreground)]">
            No sessions or logs yet. Once you run a companion session or log an episode below, trends
            and charts will appear here.
          </p>
        </Card>
      ) : (
        <ProgressCharts data={summary} />
      )}

      {/* Log an episode */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Log an episode</h2>
        <Card>
          <LogEpisodeForm profileId={id} />
        </Card>
      </section>

      {/* Export */}
      <section className="space-y-2">
        <ExportCsvButton profileId={id} />
        <p className="text-xs text-[var(--muted)]">
          Exports every session and log for this profile as a CSV for grant reporting.
        </p>
      </section>
    </div>
  );
}

function SummaryStat({ value, label }: { value: number; label: string }) {
  return (
    <span>
      <span className="font-semibold">{value}</span> {label}
    </span>
  );
}

function Dot() {
  return <span aria-hidden className="text-[var(--muted)]">·</span>;
}
