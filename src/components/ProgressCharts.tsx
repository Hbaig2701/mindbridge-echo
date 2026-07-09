'use client';

// Renders the caregiver-facing progress charts from a ProgressSummary.
// recharts 3.x (React 19 compatible). Each chart lives in its own titled Card
// and guards against empty data with a muted note.

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { ProgressSummary } from '@/lib/services/progress';
import { Card } from '@/components/ui';

// Readable, calm palette.
const RESPITE = '#0d7d78'; // teal
const AGITATION = '#b7791f'; // amber
const CALM = '#3b82f6'; // calm blue
const GRID = '#e2e8f0';
const AXIS = '#64748b';

/** Short "Jul 8" style label for a YYYY-MM-DD date. */
function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** ISO week key like "2026-W28" from a YYYY-MM-DD date. */
function isoWeekKey(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  // Shift to Thursday of the current week to get the ISO week number.
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (target.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((target.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const axisProps = {
  stroke: AXIS,
  fontSize: 11,
  tickLine: false,
} as const;

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      {children}
    </Card>
  );
}

function NotEnough() {
  return <p className="py-8 text-center text-sm text-[var(--muted)]">Not enough data yet.</p>;
}

export function ProgressCharts({ data }: { data: ProgressSummary }) {
  const series = data.series ?? [];
  const hasData = series.length > 0;

  // Keep all points; connectNulls bridges days that have no time-to-calm reading.
  const dateData = series.map((p) => ({ ...p, label: shortDate(p.date) }));

  // Sessions per ISO week, client-side aggregation.
  const weekMap = new Map<string, number>();
  for (const p of series) {
    const k = isoWeekKey(p.date);
    weekMap.set(k, (weekMap.get(k) ?? 0) + p.sessions);
  }
  const weekData = [...weekMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, sessions]) => ({ week, sessions }));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ChartCard title="Agitation episodes over time">
        {hasData ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dateData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip />
              <Bar dataKey="agitationEpisodes" name="Episodes" fill={AGITATION} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NotEnough />
        )}
      </ChartCard>

      <ChartCard title="Average time-to-calm (min)">
        {hasData ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dateData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="avgTimeToCalm"
                name="Min to calm"
                stroke={CALM}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <NotEnough />
        )}
      </ChartCard>

      <ChartCard title="Respite minutes per day">
        {hasData ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dateData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="respiteFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={RESPITE} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={RESPITE} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="respiteMin"
                name="Respite min"
                stroke={RESPITE}
                strokeWidth={2}
                fill="url(#respiteFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <NotEnough />
        )}
      </ChartCard>

      <ChartCard title="Sessions per week">
        {weekData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="week" {...axisProps} />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip />
              <Bar dataKey="sessions" name="Sessions" fill={RESPITE} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NotEnough />
        )}
      </ChartCard>
    </div>
  );
}
