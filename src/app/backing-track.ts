import { Component, OnDestroy, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { buildChordTones, parseChordName, type ParsedChord } from '@gblp/music-theory';
import { Soundfont, SplendidGrandPiano, type Smplr } from 'smplr';

import { LocalizationService } from './localization.service';
import { TempoService, type BeatEvent } from './tempo.service';

export interface TimelineSlot {
  index: number;
  chord: ParsedChord;
  beats: number;
}

export type InstrumentId = 'piano' | 'guitar' | 'synth';
export type Articulation = 'restrike' | 'sustain';
export type StrumPattern = 'none' | 'down' | 'alternating';

const INSTRUMENT_IDS: readonly InstrumentId[] = ['piano', 'guitar', 'synth'];
const STRUM_PATTERNS: readonly StrumPattern[] = ['none', 'down', 'alternating'];
const STRUM_STAGGER_SECONDS = 0.018;

// Voices a chord's pitch classes as a close-position stack starting at the
// chord's own root, anchored near `rootMidi` — simple ascending spread, no
// inversion/voice-leading.
function voiceChordMidi(tones: readonly number[], root: number, rootMidi: number): number[] {
  const rootOctaveMidi = rootMidi + root;
  return tones.map((pc) => rootOctaveMidi + ((pc - root + 12) % 12)).sort((a, b) => a - b);
}

const ROOT_MIDI = 48; // C3 — sits under the melody range, a rhythmic/harmonic bed.
// Pixel-per-beat unit for pointer-drag math on the timeline. Must match the
// 32px literal in .backing-track-block's width formula in backing-track.scss.
// A single beat's raw width sits below the 112px legibility floor there, so
// short (1–3 beat) slots render at that floor and only visibly grow past it —
// an accepted trade-off for keeping per-beat resize simple.
const BEAT_WIDTH_PX = 32;

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

  readonly instrumentIds = INSTRUMENT_IDS;
  readonly instrument = signal<InstrumentId>('piano');

  // Piano/synth only — re-strike the chord every beat (default, matches the
  // metronome's own click) or strike once per timeline slot and hold it.
  readonly articulation = signal<Articulation>('restrike');

  // Guitar only — staggers each chord tone's start time to simulate a strum
  // instead of a simultaneous block chord.
  readonly strumPatterns = STRUM_PATTERNS;
  readonly strumPattern = signal<StrumPattern>('none');

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
  // `beatsByChordIndex` maps each chord-index to a length in beats (default:
  // one full bar at the current time signature). Chord identity always comes
  // live from `chords()` — only order/length are ever frozen — so editing the
  // typed progression's chord names/qualities always shows up here
  // immediately, synced or not.
  readonly synced = signal(true);
  private readonly order = signal<number[]>([]);
  private readonly beatsByChordIndex = signal<Record<number, number>>({});

  readonly timeline = computed<TimelineSlot[]>(() => {
    const chords = this.chords();
    const beats = this.beatsByChordIndex();
    const defaultBeats = this.tempo.beatsPerMeasure();
    return this.order()
      .filter((i) => i < chords.length)
      .map((i) => ({ index: i, chord: chords[i], beats: beats[i] ?? defaultBeats }));
  });

  // Highlights whichever timeline slot is currently sounding, pulsing once
  // per beat — timed to actual audio playback via the same delay-compensated
  // setTimeout technique the metronome's accent pulse uses.
  readonly activeSlot = signal<number | null>(null);
  readonly beatPulse = signal(false);

  // Keyed by InstrumentId so switching back to an already-loaded instrument
  // is instant instead of re-fetching its samples.
  private readonly loadedInstruments = new Map<InstrumentId, Smplr>();
  private activeInstrument: Smplr | null = null;
  private unsubscribeBeat: (() => void) | null = null;
  private readonly pulseTimeouts = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    // Keeps the timeline aligned with the typed progression. While synced,
    // any text change resets it to equal full-bar slots in text order. While
    // unsynced (the user has dragged/keyed a resize or reorder), a text
    // change only reconciles: chords still present keep their custom
    // position/length, new chords are appended at a full bar, removed ones
    // drop. `order`/`beatsByChordIndex` are read here only to merge — reading
    // them untracked keeps this effect reacting to `chords`/`synced` alone.
    // Without it, this effect's own writes to those two signals would
    // re-trigger itself (each .set() below is a fresh object/array
    // reference) and hang the tab in an infinite loop.
    effect(() => {
      const chords = this.chords();
      const isSynced = this.synced();
      untracked(() => {
        if (isSynced) {
          this.order.set(chords.map((_, i) => i));
          this.beatsByChordIndex.set({});
          return;
        }
        const kept = this.order().filter((i) => i < chords.length);
        const added = chords.map((_, i) => i).filter((i) => !kept.includes(i));
        this.order.set([...kept, ...added]);
        const oldBeats = this.beatsByChordIndex();
        const nextBeats: Record<number, number> = {};
        for (const i of kept) {
          if (oldBeats[i] !== undefined) nextBeats[i] = oldBeats[i];
        }
        this.beatsByChordIndex.set(nextBeats);
      });
    });
  }

  toggle(): void {
    this.enabled.update((v) => !v);
    if (this.enabled()) {
      void this.activateInstrument(this.instrument());
    } else {
      this.clearVisualBeat();
    }
  }

  selectInstrument(id: InstrumentId): void {
    this.instrument.set(id);
    if (this.enabled()) {
      void this.activateInstrument(id);
    }
  }

  toggleArticulation(): void {
    this.articulation.update((a) => (a === 'restrike' ? 'sustain' : 'restrike'));
  }

  setStrumPattern(pattern: StrumPattern): void {
    this.strumPattern.set(pattern);
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
    this.beatsByChordIndex.set({});
    this.synced.set(true);
  }

  growBeats(slot: number): void {
    const entry = this.timeline()[slot];
    if (entry) this.setBeats(slot, entry.beats + 1);
  }

  shrinkBeats(slot: number): void {
    const entry = this.timeline()[slot];
    if (entry) this.setBeats(slot, entry.beats - 1);
  }

  private setBeats(slot: number, beats: number): void {
    const entry = this.timeline()[slot];
    if (!entry) return;
    const clamped = Math.max(1, beats);
    this.beatsByChordIndex.update((m) => ({ ...m, [entry.index]: clamped }));
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
    const startBeats = this.timeline()[slot]?.beats ?? 1;
    const onMove = (e: PointerEvent) => {
      const deltaBeats = Math.round((e.clientX - startX) / BEAT_WIDTH_PX);
      this.setBeats(slot, startBeats + deltaBeats);
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
    const startOffset = this.cumulativeBeatsBefore(slot);
    const onMove = (e: PointerEvent) => {
      const deltaBeats = Math.round((e.clientX - startX) / BEAT_WIDTH_PX);
      const targetOffset = Math.max(0, startOffset + deltaBeats);
      const targetSlot = this.slotAtBeatOffset(targetOffset);
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

  private cumulativeBeatsBefore(slot: number): number {
    return this.timeline()
      .slice(0, slot)
      .reduce((sum, e) => sum + e.beats, 0);
  }

  private slotAtBeatOffset(offset: number): number {
    const entries = this.timeline();
    let acc = 0;
    for (let i = 0; i < entries.length; i++) {
      acc += entries[i].beats;
      if (offset < acc) return i;
    }
    return entries.length - 1;
  }

  private createInstrument(id: InstrumentId): Smplr {
    const ctx = this.tempo.audioContext;
    switch (id) {
      case 'guitar':
        return Soundfont(ctx, { instrument: 'acoustic_guitar_steel' });
      case 'synth':
        return Soundfont(ctx, { instrument: 'lead_2_sawtooth' });
      case 'piano':
        return SplendidGrandPiano(ctx);
    }
  }

  private async activateInstrument(id: InstrumentId): Promise<void> {
    this.loading.set(true);
    let instrument = this.loadedInstruments.get(id);
    if (!instrument) {
      instrument = this.createInstrument(id);
      await instrument.ready;
      this.loadedInstruments.set(id, instrument);
    }
    // The user may have disabled the track or picked a different instrument
    // while this one was still loading — don't let a stale load win.
    if (!this.enabled() || this.instrument() !== id) {
      this.loading.set(false);
      return;
    }
    this.activeInstrument = instrument;
    this.loading.set(false);
    this.unsubscribeBeat ??= this.tempo.onBeat((event) => this.onBeat(event));
  }

  private onBeat(event: BeatEvent): void {
    if (!this.enabled() || !this.activeInstrument) return;
    const entries = this.timeline();
    if (!entries.length) return;
    const totalBeats = entries.reduce((sum, e) => sum + e.beats, 0);
    let pos = event.totalBeatIndex % totalBeats;
    let slot = entries.length - 1;
    for (let i = 0; i < entries.length; i++) {
      if (pos < entries[i].beats) {
        slot = i;
        break;
      }
      pos -= entries[i].beats;
    }
    const isFirstBeatOfSlot = pos === 0;
    this.scheduleVisualBeat(event.time, slot);

    const entry = entries[slot];
    const beatSeconds = 60 / this.tempo.bpm();
    const instrument = this.instrument();

    if (instrument === 'guitar') {
      this.strumChord(entry, event.time, event.totalBeatIndex, beatSeconds);
      return;
    }

    // Piano/synth: re-strike every beat (default), or strike once at the
    // start of the slot and hold it for the slot's full duration.
    if (this.articulation() === 'sustain') {
      if (!isFirstBeatOfSlot) return;
      this.playChord(entry, event.time, entry.beats * beatSeconds * 0.95);
    } else {
      this.playChord(entry, event.time, beatSeconds * 0.9);
    }
  }

  private playChord(entry: TimelineSlot, time: number, duration: number): void {
    if (!this.activeInstrument) return;
    const tones = buildChordTones(entry.chord.root, entry.chord.quality);
    const midiNotes = voiceChordMidi(tones, entry.chord.root, ROOT_MIDI);
    for (const note of midiNotes) {
      this.activeInstrument.start({ note, time, duration });
    }
  }

  private strumChord(entry: TimelineSlot, time: number, totalBeatIndex: number, beatSeconds: number): void {
    if (!this.activeInstrument) return;
    const tones = buildChordTones(entry.chord.root, entry.chord.quality);
    const midiNotes = voiceChordMidi(tones, entry.chord.root, ROOT_MIDI);
    const duration = beatSeconds * 0.9;
    const pattern = this.strumPattern();
    const direction =
      pattern === 'alternating' ? (totalBeatIndex % 2 === 0 ? 'down' : 'up') : 'down';
    const ordered = pattern === 'none' ? midiNotes : direction === 'down' ? midiNotes : [...midiNotes].reverse();
    ordered.forEach((note, i) => {
      const stagger = pattern === 'none' ? 0 : i * STRUM_STAGGER_SECONDS;
      this.activeInstrument!.start({ note, time: time + stagger, duration });
    });
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
