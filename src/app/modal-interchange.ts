import { Component, ElementRef, HostListener, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { buildChordTones, noteName, type Key, type Note } from '@gblp/music-theory';
import { SplendidGrandPiano, type Smplr } from 'smplr';

import type { TimelineSlot } from './backing-track';
import { LocalizationService } from './localization.service';
import { TempoService } from './tempo.service';
import {
  DEGREE_ROLES,
  PARALLEL_MODES,
  chordLabel,
  degreeForChord,
  degreeMatrix,
  romanNumeral,
  type DegreeCell,
  type ParallelMode,
  type Tier,
  type TriadQuality,
} from './modal-interchange-theory';

interface ProgressionChip {
  chordIndex: number;
  label: string;
  root: Note;
  quality: TriadQuality | null; // null when the chord's own quality isn't a plain triad (e.g. a 7th)
  degree: number | null; // null when chromatic to the detected key
}

interface MatrixRow {
  mode: ParallelMode;
  label: string;
  cells: DegreeCell[];
}

interface HoverCompare {
  mode: string;
  from: string;
  to: string;
  tierLabel: string;
}

const ROOT_MIDI = 60; // C4 — a comfortable register for a short preview, independent of backing-track's own bed register.

// Simple ascending close-position voicing, same idea as backing-track's own
// voiceChordMidi but intentionally not shared with it — this is a one-off
// preview sound, not part of the scheduled playback engine.
function voiceTriadMidi(tones: readonly Note[], root: Note): number[] {
  return tones.map((pc) => ROOT_MIDI + ((pc - root + 12) % 12)).sort((a, b) => a - b);
}

@Component({
  selector: 'app-modal-interchange',
  imports: [],
  templateUrl: './modal-interchange.html',
  styleUrl: './modal-interchange.scss',
})
export class ModalInterchange {
  private readonly localization = inject(LocalizationService);
  private readonly tempo = inject(TempoService);
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  readonly text = this.localization.languageDictionary;

  readonly entries = input<TimelineSlot[]>([]);
  readonly detectedKey = input<Key | null>(null);
  readonly closed = output<void>();
  readonly swap = output<{ chordIndex: number; root: Note; quality: TriadQuality }>();

  readonly modes = PARALLEL_MODES;
  readonly degrees = [0, 1, 2, 3, 4, 5, 6] as const;
  readonly tierOrder: readonly Tier[] = ['safe', 'caution', 'risky'];
  readonly selectedChordIndex = signal<number | null>(null);
  readonly volume = signal(0.7); // 0-1, drives both the full-sequence playback and every per-chord preview
  readonly hoverPreviewEnabled = signal(true); // off: hover goes silent, click previews instead
  readonly hoverCompare = signal<HoverCompare | null>(null);

  // "Do mayor · modo Jónico de Do" — the detected key framed as the common
  // parallel tonic every row of the matrix borrows against (diatonicChords
  // itself always reads off the Ionian scale for a major key, Aeolian for a
  // minor one, so that's the "home" mode this key actually sits in).
  readonly keyInfo = computed(() => {
    const key = this.detectedKey();
    if (!key) return null;
    const t = this.text().modalInterchange;
    const tonic = noteName(key.root);
    const qualityWord = key.mode === 'major' ? t.keyMajor : t.keyMinor;
    const parentMode: ParallelMode = key.mode === 'major' ? 'ionian' : 'aeolian';
    return t.keyInfo(tonic, qualityWord, t.modeNames[parentMode]);
  });

  readonly chips = computed<ProgressionChip[]>(() => {
    const key = this.detectedKey();
    return this.entries().map((entry) => ({
      chordIndex: entry.index,
      label: entry.chord.raw,
      root: entry.chord.root,
      quality: entry.chord.quality === 'major' || entry.chord.quality === 'minor' || entry.chord.quality === 'dim'
        ? entry.chord.quality
        : null,
      degree: key ? degreeForChord(key, entry.chord.root) : null,
    }));
  });

  readonly selectedChip = computed(() => {
    const index = this.selectedChordIndex();
    return this.chips().find((c) => c.chordIndex === index) ?? null;
  });

  readonly matrix = computed<MatrixRow[]>(() => {
    const key = this.detectedKey();
    if (!key) return [];
    const data = degreeMatrix(key);
    const names = this.text().modalInterchange.modeNames;
    return this.modes.map((mode) => ({ mode, label: names[mode], cells: data[mode] }));
  });

  readonly originalDegreeQualities = computed(() => {
    const key = this.detectedKey();
    if (!key) return [];
    // The "home" row is Ionian for a major key, Aeolian for a minor one —
    // same rule diatonicChords() itself uses. Reading the wrong row here
    // doesn't touch the matrix's own tier math (degreeMatrix() calls
    // diatonicChords(key) directly), only the Roman-numeral casing shown to
    // the user — but for a minor key it would wrongly print "I ii iii..."
    // instead of "i ii° III...".
    const homeMode = key.mode === 'major' ? 'ionian' : 'aeolian';
    const homeRow = degreeMatrix(key)[homeMode];
    return homeRow.map((c) => c.quality);
  });

  readonly replacingLabel = computed(() => {
    const chip = this.selectedChip();
    const key = this.detectedKey();
    if (!chip || chip.degree === null || !key) return null;
    const t = this.text().modalInterchange;
    const qualities = this.originalDegreeQualities();
    const degreeLabel = romanNumeral(chip.degree, qualities[chip.degree] ?? 'major');
    const role = t.roleNames[DEGREE_ROLES[chip.degree]];
    return t.replacing(chip.label, degreeLabel, role);
  });

  private instrument: Smplr | null = null;
  private loadingInstrument: Promise<Smplr> | null = null;

  constructor() {
    // Defaults the focused column to the progression's first interchangeable
    // chord (same affordance the feature's mockup validated with the user),
    // and re-defaults whenever the current selection stops existing — the
    // section was switched without the modal closing, or a swap changed
    // which chords are present.
    effect(() => {
      const chips = this.chips();
      const current = this.selectedChordIndex();
      if (current !== null && chips.some((c) => c.chordIndex === current)) return;
      const firstInterchangeable = chips.find((c) => c.degree !== null);
      this.selectedChordIndex.set(firstInterchangeable ? firstInterchangeable.chordIndex : null);
    });
    effect(() => {
      this.closeButton()?.nativeElement.focus();
    });
  }

  // Picking a progression chord always plays it when hover-preview is off —
  // otherwise there'd be no way to hear it at all, since hover stays silent.
  // When hover-preview is on, the hover itself already covered that.
  onChipClick(chip: ProgressionChip): void {
    if (!this.hoverPreviewEnabled() && chip.quality !== null) {
      void this.preview(chip.root, chip.quality);
    }
    this.selectChip(chip);
  }

  selectChip(chip: ProgressionChip): void {
    if (chip.degree === null) return;
    this.selectedChordIndex.set(chip.chordIndex);
    this.hoverCompare.set(null);
  }

  // `degree` comes from the cell's own column, verified against the selected
  // chip's degree rather than assumed — clicking a cell outside the
  // highlighted column (still previewable, just not a valid target) is a
  // deliberate no-op instead of silently swapping the wrong chord.
  applyCell(degree: number, cell: DegreeCell): void {
    if (cell.tier === 'same') return;
    const chip = this.selectedChip();
    if (!chip || chip.degree !== degree) return;
    this.swap.emit({ chordIndex: chip.chordIndex, root: cell.root, quality: cell.quality });
    this.hoverCompare.set(null);
  }

  // With hover-preview off, a cell's sound only happens on click — same
  // reasoning as onChipClick above. Applying still goes through applyCell's
  // own guard, so clicking a cell outside the selected column previews it
  // without side effects.
  onCellClick(degree: number, cell: DegreeCell): void {
    if (!this.hoverPreviewEnabled()) {
      void this.preview(cell.root, cell.quality);
    }
    this.applyCell(degree, cell);
  }

  onHoverToggle(event: Event): void {
    this.hoverPreviewEnabled.set((event.target as HTMLInputElement).checked);
  }

  isColumnSelected(degree: number): boolean {
    return this.selectedChip()?.degree === degree;
  }

  private async ensureInstrument(): Promise<Smplr> {
    if (this.instrument) return this.instrument;
    this.loadingInstrument ??= (async () => {
      const instrument = SplendidGrandPiano(this.tempo.audioContext);
      await instrument.ready;
      return instrument;
    })();
    this.instrument = await this.loadingInstrument;
    return this.instrument;
  }

  async preview(root: Note, quality: TriadQuality): Promise<void> {
    const instrument = await this.ensureInstrument();
    const ctx = this.tempo.audioContext;
    const tones = buildChordTones(root, quality);
    const midiNotes = voiceTriadMidi(tones, root);
    const velocity = Math.round(100 * this.volume());
    for (const note of midiNotes) {
      instrument.start({ note, time: ctx.currentTime, duration: 0.9, velocity });
    }
  }

  previewChip(chip: ProgressionChip): void {
    if (!this.hoverPreviewEnabled() || chip.quality === null) return;
    void this.preview(chip.root, chip.quality);
  }

  onVolumeInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.volume.set(value / 100);
  }

  // Plays every chord in the progression once, back to back — a quick "how
  // does the whole thing sound" pass, distinct from the per-chord hover
  // preview. Uses the real chord quality (not the triad reduction preview()
  // uses), so it's faithful to what's actually in the progression.
  async playSequence(): Promise<void> {
    const instrument = await this.ensureInstrument();
    const ctx = this.tempo.audioContext;
    const velocity = Math.round(100 * this.volume());
    const STEP = 0.62; // seconds between chord onsets
    this.entries().forEach((entry, i) => {
      const tones = buildChordTones(entry.chord.root, entry.chord.quality);
      const midiNotes = voiceTriadMidi(tones, entry.chord.root);
      const time = ctx.currentTime + i * STEP;
      for (const note of midiNotes) {
        instrument.start({ note, time, duration: 0.55, velocity });
      }
    });
  }

  chipDegreeLabel(chip: ProgressionChip): string | null {
    if (chip.degree === null) return null;
    const qualities = this.originalDegreeQualities();
    return romanNumeral(chip.degree, qualities[chip.degree] ?? 'major');
  }

  // Updates the hover comparison panel ("C → Cm — Recomendado") alongside the
  // existing audio preview — the matrix is the only borrowed-chord view this
  // app ships (no separate grouped/chip layout), so this is where "what's
  // about to change" lives.
  hoverCell(mode: ParallelMode, degree: number, cell: DegreeCell): void {
    if (this.hoverPreviewEnabled()) void this.preview(cell.root, cell.quality);
    const chip = this.selectedChip();
    if (!chip || chip.degree !== degree) return;
    this.hoverCompare.set({
      mode: this.text().modalInterchange.modeNames[mode],
      from: chip.label,
      to: chordLabel(cell.root, cell.quality),
      tierLabel: this.text().modalInterchange.tierLabels[cell.tier],
    });
  }

  close(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  readonly chordLabel = chordLabel;
  readonly romanNumeral = romanNumeral;

  degreeHeadLabel(degree: number): string {
    const quality = this.originalDegreeQualities()[degree] ?? 'major';
    return romanNumeral(degree, quality);
  }
}
