let cachedVoices: SpeechSynthesisVoice[] = [];

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** English voices, best guesses first. Voices load asynchronously on some browsers. */
export function englishVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return [];
  const all = window.speechSynthesis.getVoices();
  if (all.length) cachedVoices = all;
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.startsWith('en-US') ? 2 : v.lang.startsWith('en-GB') ? 1 : 0) + (v.localService ? 1 : 0);
  return cachedVoices.filter((v) => v.lang.toLowerCase().startsWith('en')).sort((a, b) => score(b) - score(a));
}

export function onVoicesChanged(cb: () => void): () => void {
  if (!speechSupported()) return () => {};
  window.speechSynthesis.addEventListener('voiceschanged', cb);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', cb);
}

export function speak(text: string, opts: { voiceURI?: string; rate?: number } = {}): void {
  if (!speechSupported()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = englishVoices();
  const voice = voices.find((v) => v.voiceURI === opts.voiceURI) ?? voices[0];
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'en-US';
  u.rate = opts.rate ?? 0.85;
  synth.speak(u);
}
