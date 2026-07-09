// Client-side speech playback. Tries the server TTS (/api/speak, OpenAI, calm voice);
// on any failure falls back to the browser SpeechSynthesis voice. Never throws.
//
// speak() resolves when playback FINISHES (or is interrupted via stopSpeaking) —
// this lets the hands-free loop wait for Echo to stop talking before it listens.

let currentAudio: HTMLAudioElement | null = null;
let currentResolve: (() => void) | null = null;

function finish() {
  const r = currentResolve;
  currentResolve = null;
  if (r) r();
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
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

  return new Promise<void>((resolve) => {
    currentResolve = resolve;
    (async () => {
      try {
        const res = await fetch('/api/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: clean }),
        });
        if (!res.ok) throw new Error('tts unavailable');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudio = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (currentAudio === audio) currentAudio = null;
          finish();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          finish();
        };
        await audio.play();
      } catch {
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
