import { Component, ElementRef, HostListener, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { buildChordTones, type Key, type Note } from '@gblp/music-theory';
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
    // Degree 0's Ionian/Aeolian row is always tier 'same' — read the original
    // quality straight off it instead of re-deriving diatonicChords here.
    const ionianRow = degreeMatrix(key).ionian;
    return ionianRow.map((c) => c.quality);
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

  selectChip(chip: ProgressionChip): void {
    if (chip.degree === null) return;
    this.selectedChordIndex.set(chip.chordIndex);
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
    for (const note of midiNotes) {
      instrument.start({ note, time: ctx.currentTime, duration: 0.9 });
    }
  }

  previewChip(chip: ProgressionChip): void {
    if (chip.quality === null) return;
    void this.preview(chip.root, chip.quality);
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
