// Client-side speech playback. Tries the server TTS (/api/speak, OpenAI, calm voice);
// on any failure falls back to the browser SpeechSynthesis voice. Never throws.

let currentAudio: HTMLAudioElement | null = null;

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export async function speak(text: string): Promise<void> {
  const clean = text.trim();
  if (!clean) return;
  stopSpeaking();

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
    await audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
    return;
  } catch {
    // Fall back to the browser voice.
    browserSpeak(clean);
  }
}

function browserSpeak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.9; // slightly slowed, calm pace
  utter.pitch = 1;
  const voice = pickNaturalVoice();
  if (voice) utter.voice = voice;
  window.speechSynthesis.speak(utter);
}

// Prefer a natural-sounding system voice over the default (which is often robotic).
function pickNaturalVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null; // may not be loaded yet on first call; that's ok
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const pool = en.length ? en : voices;
  // Names of the higher-quality voices across macOS / iOS / Chrome / Edge.
  const preferred = ['samantha', 'ava', 'allison', 'google us english', 'aria', 'jenny', 'zira', 'siri'];
  for (const name of preferred) {
    const match = pool.find((v) => v.name.toLowerCase().includes(name));
    if (match) return match;
  }
  // Otherwise favor a local (non-network) voice.
  return pool.find((v) => v.localService) ?? pool[0] ?? null;
}
