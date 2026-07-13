// Client-side speech playback. Plays the server TTS (/api/speak, OpenAI) through the
// SHARED Web Audio context (reliable on mobile — see audioContext.ts). Falls back to
// the browser SpeechSynthesis voice on any failure. Never throws.
//
// speak() resolves when playback FINISHES (or is interrupted via stopSpeaking) so the
// hands-free loop can wait for Echo to stop before it listens. A generation counter
// makes stopSpeaking() effective even while the /api/speak fetch is still in flight.

import { getAudioContext } from './audioContext';

let currentSource: AudioBufferSourceNode | null = null;
let currentResolve: (() => void) | null = null;
let currentController: AbortController | null = null;
let generation = 0;

function finish() {
  const r = currentResolve;
  currentResolve = null;
  if (r) r();
}

export function stopSpeaking() {
  generation++; // invalidate any in-flight speak()
  currentController?.abort();
  currentController = null;
  if (currentSource) {
    try {
      currentSource.onended = null;
      currentSource.stop();
    } catch {
      /* already stopped */
    }
    currentSource = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  finish(); // resolve any pending speak() so an awaiting loop can continue
}

export async function speak(text: string): Promise<void> {
  const clean = text.trim();
  if (!clean) return;
  stopSpeaking();

  const myGen = generation;
  const controller = new AbortController();
  currentController = controller;

  return new Promise<void>((resolve) => {
    currentResolve = resolve;
    (async () => {
      try {
        const res = await fetch('/api/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: clean }),
          signal: controller.signal,
        });
        if (myGen !== generation) return; // stopped/superseded during the fetch
        if (!res.ok) throw new Error('tts unavailable');
        const arr = await res.arrayBuffer();
        if (myGen !== generation) return;

        const ctx = getAudioContext();
        if (!ctx) throw new Error('no audio context');
        if (ctx.state === 'suspended') {
          try {
            await ctx.resume();
          } catch {
            /* ignore */
          }
        }
        const buffer = await ctx.decodeAudioData(arr);
        if (myGen !== generation) return; // stopped during decode

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        currentSource = source;
        source.onended = () => {
          if (currentSource === source) currentSource = null;
          finish();
        };
        source.start(0);
      } catch {
        if (myGen !== generation) return; // aborted — already resolved by stopSpeaking
        browserSpeak(clean);
      }
    })();
  });
}

function browserSpeak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    finish();
    return;
  }
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.9; // slightly slowed, calm pace
  utter.pitch = 1;
  const voice = pickNaturalVoice();
  if (voice) utter.voice = voice;
  utter.onend = () => finish();
  utter.onerror = () => finish();
  window.speechSynthesis.speak(utter);
}

// Prefer a natural-sounding system voice over the default (which is often robotic).
function pickNaturalVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const pool = en.length ? en : voices;
  const preferred = ['samantha', 'ava', 'allison', 'google us english', 'aria', 'jenny', 'zira', 'siri'];
  for (const name of preferred) {
    const match = pool.find((v) => v.name.toLowerCase().includes(name));
    if (match) return match;
  }
  return pool.find((v) => v.localService) ?? pool[0] ?? null;
}
