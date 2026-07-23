'use client';

// Real-time caregiver push notifications for flags.
//
// Subscribes (websocket, RLS-scoped) to INSERTs on the `flags` table and, when the
// companion raises a flag mid-conversation, immediately:
//   1. shows an in-app toast in the caregiver shell, and
//   2. fires a browser push notification (if the caregiver granted permission).
// The flag row itself remains the durable record in the Flags inbox — this is the
// real-time delivery channel on top of it.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Flag, FlagType } from '@/lib/types';

const LABELS: Record<FlagType, string> = {
  safety: 'Safety concern',
  medical: 'Medical concern',
  uncertainty: 'Needs review',
  care_need: 'Care need',
};

interface Toast {
  id: string;
  type: FlagType;
  reason: string;
}

export function FlagAlerts() {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('flag-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'flags' },
        (payload) => {
          const flag = payload.new as Flag;
          const label = LABELS[flag.type] ?? flag.type;

          setToasts((prev) => [...prev, { id: flag.id, type: flag.type, reason: flag.reason }]);
          const timer = setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== flag.id));
          }, 15000);
          timersRef.current.push(timer);

          // OS-level notification where the page-context Notification API is supported
          // (desktop browsers). Mobile browsers either lack the API (iOS Safari) or
          // require a service worker (Android Chrome, where this constructor THROWS) —
          // never let that break the in-app toast or the realtime subscription.
          try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(`MindBridge Echo — ${label}`, {
                body: flag.reason,
                tag: flag.id,
              });
            }
          } catch {
            // In-app toast + Flags inbox still deliver the alert.
          }

          // Keep the flags inbox fresh if the caregiver is looking at it.
          router.refresh();
        },
      )
      .subscribe(() => {
        // Reflect current browser-notification permission once the channel is live
        // (post-hydration, so the server and first client render stay in sync).
        if (typeof Notification !== 'undefined') setPermission(Notification.permission);
      });

    const timers = timersRef.current;
    return () => {
      supabase.removeChannel(channel);
      timers.forEach(clearTimeout);
    };
  }, [router]);

  async function enableNotifications() {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  return (
    <>
      {permission === 'default' && (
        <button
          type="button"
          onClick={enableNotifications}
          className="text-xs text-white/80 underline hover:text-white"
        >
          Enable alerts
        </button>
      )}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="alert"
              className="rounded-lg border border-[var(--border)] bg-white p-3 shadow-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--danger)]">
                  {LABELS[t.type] ?? t.type}
                </p>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-700">{t.reason}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default FlagAlerts;
