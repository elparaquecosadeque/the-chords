import { buildScale, diatonicChords, noteName, type ChordQuality, type Key, type Note } from '@gblp/music-theory';

export type ParallelMode = 'ionian' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'aeolian' | 'locrian';

export const PARALLEL_MODES: readonly ParallelMode[] = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
];

// The 7 scale degrees, indexed 0-6 regardless of key mode — matches
// diatonicChords()'s own degree ordering (Ionian for a major key, Aeolian for
// a minor one), which is the "home" scale every parallel mode borrows against.
export const DEGREE_ROLES = [
  'tonic',
  'supertonic',
  'mediant',
  'subdominant',
  'dominant',
  'submediant',
  'leading',
] as const;
export type DegreeRole = (typeof DEGREE_ROLES)[number];

export type Tier = 'same' | 'safe' | 'caution' | 'risky';
export type TriadQuality = 'major' | 'minor' | 'dim' | 'aug';

export interface DegreeCell {
  root: Note;
  quality: TriadQuality;
  tier: Tier;
}

// Stacks thirds on a scale degree (root, +2 steps, +4 steps) and reads the
// resulting triad quality off the two intervals — the same hand-verifiable
// method used to design this feature's original mockup.
function triadQuality(root: Note, third: Note, fifth: Note): TriadQuality {
  const thirdInterval = (((third - root) % 12) + 12) % 12;
  const fifthInterval = (((fifth - root) % 12) + 12) % 12;
  if (thirdInterval === 4 && fifthInterval === 7) return 'major';
  if (thirdInterval === 3 && fifthInterval === 7) return 'minor';
  if (thirdInterval === 3 && fifthInterval === 6) return 'dim';
  return 'aug'; // thirdInterval 4, fifthInterval 8 — the only remaining tertian shape
}

// The tonic (degree 0) anchors a key's sense of rest; the dominant (degree 4)
// anchors its pull back to that rest. Borrowing there is structurally riskier
// than at any other degree, independent of which mode it's borrowed from —
// this is the feature's original premise ("cambiar de acorde tónico no es lo
// mejor porque cambia por completo el reposo").
function tierFor(degree: number, quality: TriadQuality, isSame: boolean): Tier {
  if (isSame) return 'same';
  if (degree === 0) return 'risky';
  if (degree === 4) return quality === 'dim' || quality === 'aug' ? 'risky' : 'caution';
  return quality === 'dim' || quality === 'aug' ? 'caution' : 'safe';
}

// 7 modes x 7 degrees, all sharing `key.root` as the common parallel tonic.
export function degreeMatrix(key: Key): Record<ParallelMode, DegreeCell[]> {
  const original = diatonicChords(key);
  const result = {} as Record<ParallelMode, DegreeCell[]>;
  for (const mode of PARALLEL_MODES) {
    const scale = buildScale(key.root, mode);
    result[mode] = scale.map((root, i) => {
      const third = scale[(i + 2) % 7];
      const fifth = scale[(i + 4) % 7];
      const quality = triadQuality(root, third, fifth);
      const isSame = root === original[i].root && quality === original[i].quality;
      return { root, quality, tier: tierFor(i, quality, isSame) };
    });
  }
  return result;
}

// Which of the 7 scale degrees a chord sits on, matched by root only (a
// chord's extended/altered quality, e.g. a secondary-dominant 7th, doesn't
// change which degree it occupies) against EVERY parallel mode's root at
// that degree — not just the key's own diatonic 7. A chord this feature
// itself just borrowed in (e.g. a bIII) must still resolve back to its
// degree the next time the modal opens, and plain root-vs-diatonic-root
// matching alone can't do that for a chord that was never diatonic to begin
// with. null means the chord is chromatic to every mode at every degree —
// no modal-interchange column for it.
export function degreeForChord(key: Key, root: Note): number | null {
  const matrix = degreeMatrix(key);
  for (let degree = 0; degree < 7; degree++) {
    if (PARALLEL_MODES.some((mode) => matrix[mode][degree].root === root)) return degree;
  }
  return null;
}

const QUALITY_SUFFIX: Record<TriadQuality, string> = { major: '', minor: 'm', dim: 'dim', aug: 'aug' };

export function chordLabel(root: Note, quality: TriadQuality): string {
  return `${noteName(root)}${QUALITY_SUFFIX[quality]}`;
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// Degree label cased/marked by the ORIGINAL diatonic quality at that degree
// (e.g. "vii°" in a major key, "III" in a minor key) — the conventional
// Roman-numeral spelling, independent of whatever's currently borrowed in.
export function romanNumeral(degree: number, originalQuality: ChordQuality): string {
  const base = NUMERALS[degree];
  if (originalQuality === 'dim') return `${base.toLowerCase()}°`;
  if (originalQuality === 'minor') return base.toLowerCase();
  return base;
}
