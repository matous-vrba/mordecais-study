import { speak, speechSupported } from '../lib/speech';
import { useSettings } from '../state';

export function SpeakButton({ text, label, slow = false }: { text: string; label?: string; slow?: boolean }) {
  const settings = useSettings();
  if (!speechSupported()) return null;
  return (
    <button
      type="button"
      className="speak"
      aria-label={label || `Play “${text}”${slow ? ' slowly' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        speak(text, { voiceURI: settings.voiceURI, rate: settings.rate * (slow ? 0.65 : 1) });
      }}
    >
      {slow ? '🐢' : '🔊'}
      {label && <span>{label}</span>}
    </button>
  );
}
