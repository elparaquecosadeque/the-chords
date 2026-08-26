import { Component, OnDestroy, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { buildChordTones, parseChordName, type ParsedChord } from '@gblp/music-theory';
import { SplendidGrandPiano } from 'smplr';

import { LocalizationService } from './localization.service';
import { TempoService, type BeatEvent } from './tempo.service';

export interface TimelineSlot {
  index: number;
  chord: ParsedChord;
  bars: number;
}

// Voices a chord's pitch classes as a close-position stack starting at the
// chord's own root, anchored near `rootMidi` — simple ascending spread, no
// inversion/voice-leading.
function voiceChordMidi(tones: readonly number[], root: number, rootMidi: number): number[] {
  const rootOctaveMidi = rootMidi + root;
  return tones.map((pc) => rootOctaveMidi + ((pc - root + 12) % 12)).sort((a, b) => a - b);
}

const ROOT_MIDI = 48; // C3 — sits under the melody range, a rhythmic/harmonic bed.
// Pixel-per-bar unit for pointer-drag math on the timeline. Must match the
// 72px literal in .backing-track-block's width formula in backing-track.scss
// — wide enough for a chord name with an extension (e.g. "C#m7b5") to sit
// comfortably in a single 1-bar block.
const BAR_WIDTH_PX = 72;

@Component({
  selector: 'app-backing-track',
  imports: [],
  templateUrl: './backing-track.html',
  styleUrl: './backing-track.scss',
})
export class BackingTrack implements OnDestroy {
  private readonly localization = inject(LocalizationService);
  private readonly tempo = inject(TempoService);
  readonly text = this.localization.languageDictionary;

  readonly progression = input('');

  readonly isPlaying = this.tempo.isPlaying;
  readonly enabled = signal(false);
  readonly loading = signal(false);

  private readonly chords = computed(() =>
    this.progression()
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((raw) => parseChordName(raw))
      .filter((c): c is NonNullable<typeof c> => c !== null),
  );

  readonly hasChords = computed(() => this.chords().length > 0);

  // Timeline model: `order` is a permutation of indices into `chords()`, and
  // `barsByChordIndex` maps each chord-index to a bar length (default 1).
  // Chord identity always comes live from `chords()` — only order/length are
  // ever frozen — so editing the typed progression's chord names/qualities
  // always shows up here immediately, synced or not.
  readonly synced = signal(true);
  private readonly order = signal<number[]>([]);
  private readonly barsByChordIndex = signal<Record<number, number>>({});

  readonly timeline = computed<TimelineSlot[]>(() => {
    const chords = this.chords();
    const bars = this.barsByChordIndex();
    return this.order()
      .filter((i) => i < chords.length)
      .map((i) => ({ index: i, chord: chords[i], bars: bars[i] ?? 1 }));
  });

  // Highlights whichever timeline slot is currently sounding, pulsing once
  // per beat — timed to actual audio playback via the same delay-compensated
  // setTimeout technique the metronome's accent pulse uses.
  readonly activeSlot = signal<number | null>(null);
  readonly beatPulse = signal(false);

  private piano: SplendidGrandPiano | null = null;
  private unsubscribeBeat: (() => void) | null = null;
  private readonly pulseTimeouts = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    // Keeps the timeline aligned with the typed progression. While synced,
    // any text change resets it to equal 1-bar slots in text order. While
    // unsynced (the user has dragged/keyed a resize or reorder), a text
    // change only reconciles: chords still present keep their custom
    // position/length, new chords are appended at 1 bar, removed ones drop.
    // `order`/`barsByChordIndex` are read here only to merge — reading them
    // untracked keeps this effect reacting to `chords`/`synced` alone. Without
    // it, this effect's own writes to those two signals would re-trigger
    // itself (each .set() below is a fresh object/array reference) and hang
    // the tab in an infinite loop.
    effect(() => {
      const chords = this.chords();
      const isSynced = this.synced();
      untracked(() => {
        if (isSynced) {
          this.order.set(chords.map((_, i) => i));
          this.barsByChordIndex.set({});
          return;
        }
        const kept = this.order().filter((i) => i < chords.length);
        const added = chords.map((_, i) => i).filter((i) => !kept.includes(i));
        this.order.set([...kept, ...added]);
        const oldBars = this.barsByChordIndex();
        const nextBars: Record<number, number> = {};
        for (const i of kept) {
          if (oldBars[i] !== undefined) nextBars[i] = oldBars[i];
        }
        this.barsByChordIndex.set(nextBars);
      });
    });
  }

  toggle(): void {
    this.enabled.update((v) => !v);
    if (this.enabled()) {
      void this.ensurePiano();
    } else {
      this.clearVisualBeat();
    }
  }

  toggleSync(): void {
    if (this.synced()) {
      this.synced.set(false);
    } else {
      this.forceResync();
    }
  }

  private forceResync(): void {
    const chords = this.chords();
    this.order.set(chords.map((_, i) => i));
    this.barsByChordIndex.set({});
    this.synced.set(true);
  }

  growBars(slot: number): void {
    const entry = this.timeline()[slot];
    if (entry) this.setBars(slot, entry.bars + 1);
  }

  shrinkBars(slot: number): void {
    const entry = this.timeline()[slot];
    if (entry) this.setBars(slot, entry.bars - 1);
  }

  private setBars(slot: number, bars: number): void {
    const entry = this.timeline()[slot];
    if (!entry) return;
    const clamped = Math.max(1, bars);
    this.barsByChordIndex.update((m) => ({ ...m, [entry.index]: clamped }));
    this.synced.set(false);
  }

  moveLeft(slot: number): void {
    this.moveSlot(slot, slot - 1);
  }

  moveRight(slot: number): void {
    this.moveSlot(slot, slot + 1);
  }

  private moveSlot(from: number, to: number): void {
    const current = this.order();
    if (to < 0 || to >= current.length || from === to) return;
    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    this.order.set(next);
    this.synced.set(false);
  }

  onResizeDragStart(event: PointerEvent, slot: number): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).focus();
    const startX = event.clientX;
    const startBars = this.timeline()[slot]?.bars ?? 1;
    const onMove = (e: PointerEvent) => {
      const deltaBars = Math.round((e.clientX - startX) / BAR_WIDTH_PX);
      this.setBars(slot, startBars + deltaBars);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  onReorderDragStart(event: PointerEvent, slot: number): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).focus();
    const startX = event.clientX;
    let currentSlot = slot;
    const startOffset = this.cumulativeBarsBefore(slot);
    const onMove = (e: PointerEvent) => {
      const deltaBars = Math.round((e.clientX - startX) / BAR_WIDTH_PX);
      const targetOffset = Math.max(0, startOffset + deltaBars);
      const targetSlot = this.slotAtBarOffset(targetOffset);
      if (targetSlot !== currentSlot) {
        this.moveSlot(currentSlot, targetSlot);
        currentSlot = targetSlot;
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  private cumulativeBarsBefore(slot: number): number {
    return this.timeline()
      .slice(0, slot)
      .reduce((sum, e) => sum + e.bars, 0);
  }

  private slotAtBarOffset(offset: number): number {
    const entries = this.timeline();
    let acc = 0;
    for (let i = 0; i < entries.length; i++) {
      acc += entries[i].bars;
      if (offset < acc) return i;
    }
    return entries.length - 1;
  }

  private async ensurePiano(): Promise<void> {
    if (this.piano || this.loading()) return;
    this.loading.set(true);
    const piano = new SplendidGrandPiano(this.tempo.audioContext);
    await piano.ready;
    this.piano = piano;
    this.loading.set(false);
    this.unsubscribeBeat = this.tempo.onBeat((event) => this.onBeat(event));
  }

  private onBeat(event: BeatEvent): void {
    if (!this.enabled() || !this.piano) return;
    const entries = this.timeline();
    if (!entries.length) return;
    const totalBars = entries.reduce((sum, e) => sum + e.bars, 0);
    let pos = event.measureIndex % totalBars;
    let slot = entries.length - 1;
    for (let i = 0; i < entries.length; i++) {
      if (pos < entries[i].bars) {
        slot = i;
        break;
      }
      pos -= entries[i].bars;
    }
    this.scheduleVisualBeat(event.time, slot);
    const entry = entries[slot];
    const tones = buildChordTones(entry.chord.root, entry.chord.quality);
    const midiNotes = voiceChordMidi(tones, entry.chord.root, ROOT_MIDI);
    const beatSeconds = 60 / this.tempo.bpm();
    for (const note of midiNotes) {
      this.piano.start({ note, time: event.time, duration: beatSeconds * 0.9 });
    }
  }

  private scheduleVisualBeat(time: number, slot: number): void {
    const delayMs = Math.max(0, (time - this.tempo.audioContext.currentTime) * 1000);
    const onId = setTimeout(() => {
      this.pulseTimeouts.delete(onId);
      this.activeSlot.set(slot);
      this.beatPulse.set(true);
      const offId = setTimeout(() => {
        this.pulseTimeouts.delete(offId);
        this.beatPulse.set(false);
      }, 150);
      this.pulseTimeouts.add(offId);
    }, delayMs);
    this.pulseTimeouts.add(onId);
  }

  private clearVisualBeat(): void {
    for (const id of this.pulseTimeouts) clearTimeout(id);
    this.pulseTimeouts.clear();
    this.activeSlot.set(null);
    this.beatPulse.set(false);
  }

  ngOnDestroy(): void {
    this.unsubscribeBeat?.();
    this.clearVisualBeat();
  }
}
