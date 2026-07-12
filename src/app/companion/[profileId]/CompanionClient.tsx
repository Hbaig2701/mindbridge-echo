'use client';

// Care-recipient mode: warm, large, HANDS-FREE. Tap once to begin; after that the
// person just talks — Echo speaks, then automatically listens for the next turn.
// No tapping between turns (dementia-friendly, minimal friction). Speaks every reply
// aloud; a text fallback is always available. A clear "End" control stops listening.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VoiceMic } from '@/lib/voiceMic';
import { speak, stopSpeaking } from '@/lib/ttsClient';
import type { MessageTurnResponse, Profile } from '@/lib/types';

interface Bubble {
  role: 'user' | 'assistant';
  text: string;
}

type Mode = 'idle' | 'listening' | 'thinking' | 'speaking';

export function CompanionClient({ profile }: { profile: Profile }) {
  const router = useRouter();
  const firstName = profile.name.split(' ')[0] || profile.name;
  const greeting = `Hello ${firstName}. It's so good to spend a little time with you. How are you feeling today?`;

  const [bubbles, setBubbles] = useState<Bubble[]>([{ role: 'assistant', text: greeting }]);
  const [mode, setMode] = useState<Mode>('idle');
  const [typed, setTyped] = useState('');
  const [showText, setShowText] = useState(false);
  const [micDenied, setMicDenied] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const sessionStartedRef = useRef(false);
  const micRef = useRef<VoiceMic | null>(null);
  const activeRef = useRef(false);
  const loopRunningRef = useRef(false);
  const pendingTypedRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const turnRef = useRef(0); // increments each turn; guards stale speak() callbacks
  const speakingRef = useRef(false); // is Echo's voice currently playing?

  // Create the session on mount (no gesture needed). Greeting is spoken on first tap.
  useEffect(() => {
    // Guard against React StrictMode double-invoking this effect (dev) → 2 sessions.
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    (async () => {
      try {
        const res = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId: profile.id, mode: 'care_recipient' }),
        });
        const data = await res.json();
        if (res.ok) sessionIdRef.current = data.sessionId;
      } catch {
        /* replies will fall back gracefully if the session is missing */
      }
    })();
    return () => {
      activeRef.current = false;
      micRef.current?.cancel();
      stopSpeaking();
      micRef.current?.close();
      micRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [bubbles, mode]);

  const endSession = async () => {
    const respiteSeconds = startedAtRef.current
      ? Math.round((Date.now() - startedAtRef.current) / 1000)
      : 0;
    const sessionId = sessionIdRef.current;
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

  async function getReply(text: string): Promise<MessageTurnResponse> {
    try {
      const res = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current, content: text, inputChannel: 'voice' }),
      });
      return (await res.json()) as MessageTurnResponse;
    } catch {
      return {
        reply:
          "I'm having a little trouble hearing you just now, but I'm still right here. Could you say that again?",
        assessment: {
          distress: false,
          distress_type: 'none',
          safety_concern: false,
          safety_type: 'none',
          care_need: false,
          care_need_type: 'none',
          uncertainty: false,
          confidence: 0,
        },
        flags: [],
        handoff: false,
      };
    }
  }

  // Add the user's words, get Echo's reply, and speak it (awaits until she finishes).
  // When `abortIfEnded` (the hands-free loop), bail after the network wait if the
  // conversation was ended mid-flight so Echo doesn't start talking after "End".
  async function respondTo(text: string, abortIfEnded = false) {
    setBubbles((b) => [...b, { role: 'user', text }]);
    setMode('thinking');
    const data = await getReply(text);
    if (abortIfEnded && !activeRef.current) return;
    const reply = data.reply || "I'm right here with you. Let's take a slow breath together.";
    setBubbles((b) => [...b, { role: 'assistant', text: reply }]);
    setMode('speaking');
    await speak(reply);
  }

  // Speak a reply WITHOUT blocking the loop, so the next listen() runs concurrently
  // with Echo's voice (that's what makes barge-in possible). Guards the mode flip
  // with the turn counter so a stale finish can't overwrite a newer turn.
  function speakReply(reply: string, myTurn: number) {
    setMode('speaking');
    speakingRef.current = true;
    speak(reply).then(() => {
      speakingRef.current = false;
      if (activeRef.current && turnRef.current === myTurn) setMode('listening');
    });
  }

  // The hands-free loop: always listening (even while Echo speaks). If the patient
  // starts talking, Echo is cut off instantly (barge-in) and we respond to them.
  async function conversationLoop() {
    if (loopRunningRef.current) return;
    loopRunningRef.current = true;
    let fastEmpties = 0; // guard against a dead mic spinning the loop
    while (activeRef.current) {
      if (!speakingRef.current) setMode('listening');
      const t0 = Date.now();
      // onSpeechStart cuts Echo off the moment the patient begins speaking.
      const spoken = (await micRef.current?.listen(() => stopSpeaking())) ?? '';
      const elapsed = Date.now() - t0;
      let text = spoken;
      if (!text && pendingTypedRef.current) {
        text = pendingTypedRef.current;
        pendingTypedRef.current = null;
      }
      if (!activeRef.current) break;
      if (!text) {
        // A real "no speech" listen takes seconds. If listen() keeps returning
        // instantly, the mic stream has died — stop spinning and fall back to text.
        if (elapsed < 400) {
          if (++fastEmpties >= 3) {
            setMicDenied(true);
            setShowText(true);
            break;
          }
          await new Promise((r) => setTimeout(r, 400));
        } else {
          fastEmpties = 0;
        }
        continue; // silence — keep listening, no phantom messages
      }
      fastEmpties = 0;
      stopSpeaking(); // ensure Echo is silent before we respond (barge-in / typed)
      const myTurn = ++turnRef.current;
      setBubbles((b) => [...b, { role: 'user', text }]);
      setMode('thinking');
      const data = await getReply(text);
      if (!activeRef.current || turnRef.current !== myTurn) continue;
      const reply = data.reply || "I'm right here with you. Let's take a slow breath together.";
      setBubbles((b) => [...b, { role: 'assistant', text: reply }]);
      speakReply(reply, myTurn); // fire-and-forget; loop keeps listening for barge-in
    }
    loopRunningRef.current = false;
    speakingRef.current = false;
    if (!activeRef.current) setMode('idle');
  }

  async function startConversation() {
    setMicDenied(false);
    try {
      micRef.current = await VoiceMic.create(); // must be inside the tap gesture
    } catch {
      setMicDenied(true);
      setShowText(true);
      return;
    }
    activeRef.current = true;
    startedAtRef.current = Date.now();
    // Speak the greeting fire-and-forget and start the loop immediately, so the
    // patient can even interrupt the greeting to jump in.
    speakReply(greeting, ++turnRef.current);
    conversationLoop();
  }

  function endConversation() {
    activeRef.current = false;
    turnRef.current++; // invalidate any pending speak() finish callback
    speakingRef.current = false;
    micRef.current?.cancel();
    stopSpeaking();
    micRef.current?.close();
    micRef.current = null;
    setMode('idle');
  }

  async function submitTyped(e: React.FormEvent) {
    e.preventDefault();
    const t = typed.trim();
    if (!t) return;
    setTyped('');
    if (activeRef.current) {
      // Hand the typed text to the running loop and stop the current listen.
      pendingTypedRef.current = t;
      micRef.current?.cancel();
    } else {
      // Not in hands-free mode → a one-off typed exchange.
      await respondTo(t);
      setMode('idle');
    }
  }

  const statusText =
    mode === 'listening'
      ? 'Listening…'
      : mode === 'thinking'
        ? 'One moment…'
        : mode === 'speaking'
          ? 'Echo is speaking…'
          : '';

  return (
    <div className="warm-mode min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-5 py-3 border-b border-black/10">
        <span className="text-lg font-semibold">Echo</span>
        <button
          onClick={async () => {
            endConversation();
            await endSession();
            router.push(`/caregiver/profiles/${profile.id}`);
          }}
          className="rounded-lg px-4 py-2 text-base bg-black/5 text-[var(--warm-fg)]"
        >
          ← Caregiver
        </button>
      </header>

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
      </div>

      <div className="px-4 pb-6 pt-3 border-t border-black/10 flex flex-col items-center gap-4">
        {mode === 'idle' ? (
          <>
            <button
              onClick={startConversation}
              className="flex h-40 w-40 flex-col items-center justify-center rounded-full bg-[var(--warm-accent)] text-[var(--warm-accent-fg)] text-xl font-semibold shadow-lg"
            >
              <MicGlyph />
              <span className="mt-2">Start talking</span>
            </button>
            <p className="text-center text-base opacity-70">
              Tap once, then just talk — no need to tap again.
            </p>
          </>
        ) : (
          <>
            <StatusOrb mode={mode} />
            <p className="text-lg">{statusText}</p>
            <button
              onClick={endConversation}
              className="rounded-full border border-black/20 px-6 py-2 text-base"
            >
              End conversation
            </button>
          </>
        )}

        {micDenied && (
          <p className="text-center text-base text-[var(--danger)]">
            The microphone isn&apos;t available — you can type below instead.
          </p>
        )}

        {showText ? (
          <form className="w-full flex gap-2" onSubmit={submitTyped}>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Or type here…"
              className="flex-1 rounded-xl border border-black/15 bg-white px-4 py-3 text-xl"
              autoFocus
            />
            <button
              type="submit"
              disabled={!typed.trim()}
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

function StatusOrb({ mode }: { mode: Mode }) {
  const color =
    mode === 'listening'
      ? 'bg-[var(--warm-accent)]'
      : mode === 'speaking'
        ? 'bg-[var(--warm-accent)]'
        : 'bg-black/20';
  const animate = mode === 'listening' || mode === 'speaking' ? 'animate-pulse' : '';
  return (
    <div className={`flex h-40 w-40 items-center justify-center rounded-full ${color} ${animate} text-[var(--warm-accent-fg)] shadow-lg`}>
      <MicGlyph />
    </div>
  );
}

function MicGlyph() {
  return (
    <svg width={40} height={40} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" fill="currentColor" />
      <path
        d="M19 11a7 7 0 0 1-14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
