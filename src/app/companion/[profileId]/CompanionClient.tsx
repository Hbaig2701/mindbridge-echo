'use client';

// Care-recipient mode: warm, large, unhurried, dominant push-to-talk. Speaks every
// reply aloud. Text entry is always available as a fallback. No dead-ends.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MicButton } from '@/components/MicButton';
import { speak, stopSpeaking } from '@/lib/ttsClient';
import type { MessageTurnResponse, Profile } from '@/lib/types';

interface Bubble {
  role: 'user' | 'assistant';
  text: string;
}

export function CompanionClient({ profile }: { profile: Profile }) {
  const router = useRouter();
  const firstName = profile.name.split(' ')[0] || profile.name;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([
    {
      role: 'assistant',
      text: `Hello ${firstName}. It's so good to spend a little time with you. How are you feeling today?`,
    },
  ]);
  const [pending, setPending] = useState(false);
  const [typed, setTyped] = useState('');
  const [showText, setShowText] = useState(false);
  const [handoff, setHandoff] = useState(false);

  // Set on mount (see the greeting effect); avoids an impure Date.now() during render.
  const startedAtRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const greeted = useRef(false);

  // Start a session on mount (once) and speak the greeting.
  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;
    startedAtRef.current = Date.now();
    (async () => {
      try {
        const res = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId: profile.id, mode: 'care_recipient' }),
        });
        const data = await res.json();
        if (res.ok) setSessionId(data.sessionId);
      } catch {
        /* start still works; message calls will error gracefully if no session */
      }
      speak(bubbles[0].text);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to the newest bubble.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [bubbles, pending]);

  const endSession = async () => {
    stopSpeaking();
    const respiteSeconds = Math.round((Date.now() - startedAtRef.current) / 1000);
    if (sessionId) {
      try {
        await fetch('/api/session', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, respiteSeconds }),
        });
      } catch {
        /* best effort */
      }
    }
  };

  const send = async (text: string, channel: 'voice' | 'text') => {
    const content = text.trim();
    if (!content || pending) return;
    setTyped('');
    setBubbles((b) => [...b, { role: 'user', text: content }]);
    setPending(true);
    try {
      const res = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, content, inputChannel: channel }),
      });
      const data: MessageTurnResponse = await res.json();
      const reply =
        data.reply ||
        "I'm right here with you. Let's take a slow breath together.";
      setBubbles((b) => [...b, { role: 'assistant', text: reply }]);
      setHandoff(Boolean(data.handoff));
      speak(reply);
    } catch {
      const fallback =
        "I'm having a little trouble hearing you just now, but I'm still right here. Could you say that again?";
      setBubbles((b) => [...b, { role: 'assistant', text: fallback }]);
      speak(fallback);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="warm-mode min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-black/10">
        <span className="text-lg font-semibold">Echo</span>
        <button
          onClick={async () => {
            await endSession();
            router.push(`/caregiver/profiles/${profile.id}`);
          }}
          className="rounded-lg px-4 py-2 text-base bg-black/5 text-[var(--warm-fg)]"
        >
          ← Caregiver
        </button>
      </header>

      {handoff && (
        <div className="mx-4 mt-3 rounded-xl bg-[var(--warm-accent)]/15 px-5 py-3 text-lg">
          I&apos;ve let {firstName}&apos;s caregiver know — they&apos;ll be along in a moment.
        </div>
      )}

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {bubbles.map((b, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-3xl px-5 py-3 ${
              b.role === 'assistant'
                ? 'bg-[var(--warm-card)] shadow-sm'
                : 'ml-auto bg-[var(--warm-accent)] text-[var(--warm-accent-fg)]'
            }`}
          >
            {b.text}
          </div>
        ))}
        {pending && (
          <div className="max-w-[60%] rounded-3xl bg-[var(--warm-card)] px-5 py-3 text-black/50">
            …
          </div>
        )}
      </div>

      {/* Push-to-talk + text fallback */}
      <div className="px-4 pb-6 pt-3 border-t border-black/10 flex flex-col items-center gap-4">
        <MicButton
          size="lg"
          idleLabel="Talk to Echo"
          onTranscript={(t) => send(t, 'voice')}
        />

        {showText ? (
          <form
            className="w-full flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(typed, 'text');
            }}
          >
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Or type here…"
              className="flex-1 rounded-xl border border-black/15 bg-white px-4 py-3 text-xl"
              autoFocus
            />
            <button
              type="submit"
              disabled={pending || !typed.trim()}
              className="rounded-xl bg-[var(--warm-accent)] px-5 py-3 text-xl text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        ) : (
          <button onClick={() => setShowText(true)} className="text-base underline opacity-70">
            or type instead
          </button>
        )}

        <p className="text-center text-sm opacity-60">
          This is a companion tool, not for emergencies — call 911 for emergencies.
        </p>
      </div>
    </div>
  );
}
