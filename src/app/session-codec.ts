// Compact, shareable encoding for a "jam session" snapshot (BPM, time
// signature, progression text, and the backing track's rich per-section
// state) — packed into a single URL query param (?s=...). Short property
// names and omitting default-valued fields keep the encoded string small;
// `v` lets a future format change coexist with old shared links.

export interface SavedSessionSectionState {
  order?: number[]; // omitted when it matches the chords' written order
  beats?: Record<number, number>; // omitted when empty (no custom slot lengths)
  repeat?: number; // omitted when 1
  infinite?: boolean; // omitted when false
}

export interface SavedSessionData {
  v: 1;
  bpm: number;
  beats: number; // beatsPerMeasure / time signature
  prog: string; // raw progression text, re-parsed into sections on load
  sectionOrder?: number[]; // omitted when it matches the parsed section order
  sections?: Record<number, SavedSessionSectionState>;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function encodeSession(data: SavedSessionData): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(data)));
}

export function decodeSession(param: string): SavedSessionData | null {
  try {
    const json = new TextDecoder().decode(fromBase64Url(param));
    const parsed: unknown = JSON.parse(json);
    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed as SavedSessionData).v === 1 &&
      typeof (parsed as SavedSessionData).bpm === 'number' &&
      typeof (parsed as SavedSessionData).beats === 'number' &&
      typeof (parsed as SavedSessionData).prog === 'string'
    ) {
      return parsed as SavedSessionData;
    }
    return null;
  } catch {
    return null;
  }
}
