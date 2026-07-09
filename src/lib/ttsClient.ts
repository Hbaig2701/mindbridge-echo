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
  window.speechSynthesis.speak(utter);
}
