// A single shared Web Audio context for the whole companion session, used by BOTH
// the mic (VoiceMic) and TTS playback (ttsClient).
//
// Why Web Audio instead of <audio>.play(): on mobile (iOS Safari especially),
// HTMLAudioElement.play() is blocked unless called synchronously inside a user
// gesture. Our TTS plays AFTER an async fetch, so it gets blocked → no sound. A
// Web Audio context, once resumed inside the "Start talking" tap, can play buffers
// at any time afterward — which is what makes Echo's voice reliable on phones.

let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

// Call this SYNCHRONOUSLY from the Start-talking tap handler (a user gesture) to
// unlock audio playback on mobile. Resumes the context and plays a 1-sample silent
// buffer, which iOS requires to fully unlock output.
export async function unlockAudio(): Promise<void> {
  const c = getAudioContext();
  if (!c) return;
  // Play the silent buffer FIRST, synchronously inside the gesture (iOS unlock), then
  // resume. Both must be initiated within the user tap for mobile audio to work.
  try {
    const buffer = c.createBuffer(1, 1, 22050);
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.connect(c.destination);
    source.start(0);
  } catch {
    /* ignore */
  }
  try {
    if (c.state === 'suspended') await c.resume();
  } catch {
    /* ignore */
  }
}
