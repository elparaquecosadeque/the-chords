import { Component, ElementRef, OnDestroy, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { buildChordTones, parseChordName, suggestChordName, type ParsedChord } from '@gblp/music-theory';
import { Soundfont, SplendidGrandPiano, type Smplr } from 'smplr';

import { LocalizationService } from './localization.service';
import { TempoService, type BeatEvent } from './tempo.service';

export interface TimelineSlot {
  index: number;
  chord: ParsedChord;
  beats: number;
}

// A section of the song: `name` is null for the plain "Am, G, C, F" mode
// (a single implicit, unnamed section) and a string once the typed
// progression uses "Name: chords; Name: chords;" syntax — detected purely by
// the presence of a ':' in the text, so the two modes share one rendering
// and playback path instead of being separate features bolted together.
export interface SongSection {
  key: number;
  name: string | null;
  chords: ParsedChord[];
  // Tokens that didn't parse as a chord — surfaced in the UI instead of
  // vanishing silently, matching how Soloin/Chord Finder report a bad token
  // (with a fuzzy-match suggestion when there's a single confident guess).
  unparsed: { raw: string; suggestion: string | null }[];
}

interface SectionState {
  order: number[];
  beats: Record<number, number>;
  synced: boolean;
  repeatCount: number;
  infinite: boolean;
}

export type InstrumentId = 'piano' | 'guitar' | 'synth';
export type Articulation = 'restrike' | 'sustain';
export type StrumPattern = 'none' | 'down' | 'alternating';

const INSTRUMENT_IDS: readonly InstrumentId[] = ['piano', 'guitar', 'synth'];
const STRUM_PATTERNS: readonly StrumPattern[] = ['none', 'down', 'alternating'];
const STRUM_STAGGER_SECONDS = 0.018;
const MAX_REPEAT_COUNT = 5;

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

function parseChordList(raw: string): { chords: ParsedChord[]; unparsed: SongSection['unparsed'] } {
  const chords: ParsedChord[] = [];
  const unparsed: SongSection['unparsed'] = [];
  for (const token of raw.split(',').map((c) => c.trim()).filter(Boolean)) {
    const parsed = parseChordName(token);
    if (parsed) chords.push(parsed);
    else unparsed.push({ raw: token, suggestion: suggestChordName(token) });
  }
  return { chords, unparsed };
}

// "Verse: Am, G, C, F; Chorus: F, G, C, C;" — split on ';', each segment
// "Name: chords" split on the first ':'. A segment with no colon, an empty
// name, or zero parseable chords is skipped entirely (nothing to show a row
// for); a segment with at least one valid chord keeps its bad tokens in
// `unparsed` for the template to surface.
function parseSongStructure(raw: string): SongSection[] {
  return raw
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment, i): SongSection | null => {
      const colonIndex = segment.indexOf(':');
      if (colonIndex === -1) return null;
      const name = segment.slice(0, colonIndex).trim();
      if (!name) return null;
      const { chords, unparsed } = parseChordList(segment.slice(colonIndex + 1));
      if (!chords.length) return null;
      return { key: i, name, chords, unparsed };
    })
    .filter((s): s is SongSection => s !== null);
}

@Component({
  selector: 'app-backing-track',
  imports: [],
  templateUrl: './backing-track.html',
  styleUrl: './backing-track.scss',
})
export class BackingTrack implements OnDestroy {
  private readonly localization = inject(LocalizationService);
  private readonly tempo = inject(TempoService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
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

  // Detected purely from the text: any ':' means "Name: chords;" song-structure
  // syntax (one row per section, each with its own repeat controls); no ':'
  // means the plain single progression, modeled as one implicit unnamed section.
  readonly sections = computed<SongSection[]>(() => {
    const raw = this.progression();
    if (raw.includes(':')) return parseSongStructure(raw);
    const { chords, unparsed } = parseChordList(raw);
    return chords.length ? [{ key: 0, name: null, chords, unparsed }] : [];
  });

  readonly hasChords = computed(() => this.sections().length > 0);
  readonly isSongMode = computed(() => {
    const sections = this.sections();
    return sections.length > 0 && sections[0].name !== null;
  });

  private readonly sectionStates = signal<Map<number, SectionState>>(new Map());

  readonly allSynced = computed(() => {
    const states = this.sectionStates();
    return this.sections().every((s) => states.get(s.key)?.synced ?? true);
  });

  // Playback/display order for whole sections — independent of chord editing
  // within a section. Defaults to written order; dragging a section's handle
  // (song mode only) reorders it here without touching the typed text.
  private readonly sectionOrder = signal<number[]>([]);

  readonly orderedSections = computed<SongSection[]>(() => {
    const sections = this.sections();
    const byKey = new Map(sections.map((s) => [s.key, s]));
    const ordered = this.sectionOrder()
      .filter((k) => byKey.has(k))
      .map((k) => byKey.get(k)!);
    const missing = sections.filter((s) => !this.sectionOrder().includes(s.key));
    return [...ordered, ...missing];
  });

  // Highlights whichever section+slot is currently sounding, pulsing once per
  // beat — timed to actual audio playback via the same delay-compensated
  // setTimeout technique the metronome's accent pulse uses.
  readonly activeSectionKey = signal<number | null>(null);
  readonly activeSlot = signal<number | null>(null);
  readonly beatPulse = signal(false);

  // Keyed by InstrumentId so switching back to an already-loaded instrument
  // is instant instead of re-fetching its samples.
  private readonly loadedInstruments = new Map<InstrumentId, Smplr>();
  private activeInstrument: Smplr | null = null;
  private unsubscribeBeat: (() => void) | null = null;
  private readonly pulseTimeouts = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    // Keeps every section's timeline aligned with its own chord list. While a
    // section is synced, any text change resets it to equal full-bar slots in
    // its written order. While unsynced (the user has dragged/keyed a resize
    // or reorder on that section), a text change only reconciles: chords
    // still present keep their custom position/length, new ones are appended
    // at a full bar, removed ones drop. New sections get a fresh synced
    // state; sections no longer present are garbage-collected. `sectionStates`
    // is read here only to merge — reading it untracked keeps this effect
    // reacting to `sections` alone. Without it, this effect's own writes
    // would re-trigger itself (each .set() below is a fresh Map/object
    // reference) and hang the tab in an infinite loop.
    effect(() => {
      const sections = this.sections();
      untracked(() => {
        const current = this.sectionStates();
        const next = new Map(current);
        const validKeys = new Set(sections.map((s) => s.key));
        for (const key of next.keys()) {
          if (!validKeys.has(key)) next.delete(key);
        }

        const keptOrder = this.sectionOrder().filter((k) => validKeys.has(k));
        const newKeys = sections.map((s) => s.key).filter((k) => !keptOrder.includes(k));
        this.sectionOrder.set([...keptOrder, ...newKeys]);

        for (const section of sections) {
          const chords = section.chords;
          const existing = next.get(section.key);
          if (!existing) {
            next.set(section.key, {
              order: chords.map((_, i) => i),
              beats: {},
              synced: true,
              repeatCount: 1,
              infinite: false,
            });
            continue;
          }
          if (existing.synced) {
            next.set(section.key, { ...existing, order: chords.map((_, i) => i), beats: {} });
            continue;
          }
          const kept = existing.order.filter((i) => i < chords.length);
          const added = chords.map((_, i) => i).filter((i) => !kept.includes(i));
          const oldBeats = existing.beats;
          const beats: Record<number, number> = {};
          for (const i of kept) {
            if (oldBeats[i] !== undefined) beats[i] = oldBeats[i];
          }
          next.set(section.key, { ...existing, order: [...kept, ...added], beats });
        }
        this.sectionStates.set(next);
      });
    });
  }

  private sectionByKey(key: number): SongSection | undefined {
    return this.sections().find((s) => s.key === key);
  }

  timelineFor(section: SongSection): TimelineSlot[] {
    const state = this.sectionStates().get(section.key);
    if (!state) return [];
    const defaultBeats = this.tempo.beatsPerMeasure();
    return state.order
      .filter((i) => i < section.chords.length)
      .map((i) => ({ index: i, chord: section.chords[i], beats: state.beats[i] ?? defaultBeats }));
  }

  private totalBeatsFor(section: SongSection): number {
    return this.timelineFor(section).reduce((sum, e) => sum + e.beats, 0);
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

  toggleGlobalSync(): void {
    if (this.allSynced()) {
      this.sectionStates.update((map) => {
        const next = new Map(map);
        for (const [key, state] of next) next.set(key, { ...state, synced: false });
        return next;
      });
    } else {
      this.forceResyncAll();
    }
  }

  private forceResyncAll(): void {
    const sections = this.sections();
    this.sectionStates.update((map) => {
      const next = new Map(map);
      for (const section of sections) {
        const existing = next.get(section.key);
        next.set(section.key, {
          order: section.chords.map((_, i) => i),
          beats: {},
          synced: true,
          repeatCount: existing?.repeatCount ?? 1,
          infinite: existing?.infinite ?? false,
        });
      }
      return next;
    });
  }

  cycleRepeatCount(sectionKey: number): void {
    this.updateSectionState(sectionKey, (s) => ({
      ...s,
      repeatCount: s.repeatCount >= MAX_REPEAT_COUNT ? 1 : s.repeatCount + 1,
      infinite: false,
    }));
  }

  toggleInfinite(sectionKey: number): void {
    this.updateSectionState(sectionKey, (s) => ({ ...s, infinite: !s.infinite }));
  }

  repeatCountFor(sectionKey: number): number {
    return this.sectionStates().get(sectionKey)?.repeatCount ?? 1;
  }

  isInfiniteFor(sectionKey: number): boolean {
    return this.sectionStates().get(sectionKey)?.infinite ?? false;
  }

  growBeats(sectionKey: number, slot: number): void {
    const section = this.sectionByKey(sectionKey);
    if (!section) return;
    const entry = this.timelineFor(section)[slot];
    if (entry) this.setBeats(sectionKey, slot, entry.beats + 1);
  }

  shrinkBeats(sectionKey: number, slot: number): void {
    const section = this.sectionByKey(sectionKey);
    if (!section) return;
    const entry = this.timelineFor(section)[slot];
    if (entry) this.setBeats(sectionKey, slot, entry.beats - 1);
  }

  private setBeats(sectionKey: number, slot: number, beats: number): void {
    const section = this.sectionByKey(sectionKey);
    if (!section) return;
    const entry = this.timelineFor(section)[slot];
    if (!entry) return;
    const clamped = Math.max(1, beats);
    this.updateSectionState(sectionKey, (s) => ({
      ...s,
      beats: { ...s.beats, [entry.index]: clamped },
      synced: false,
    }));
  }

  moveLeft(sectionKey: number, slot: number): void {
    this.moveSlot(sectionKey, slot, slot - 1);
  }

  moveRight(sectionKey: number, slot: number): void {
    this.moveSlot(sectionKey, slot, slot + 1);
  }

  private moveSlot(sectionKey: number, from: number, to: number): void {
    const state = this.sectionStates().get(sectionKey);
    if (!state || to < 0 || to >= state.order.length || from === to) return;
    const nextOrder = [...state.order];
    const [moved] = nextOrder.splice(from, 1);
    nextOrder.splice(to, 0, moved);
    this.updateSectionState(sectionKey, (s) => ({ ...s, order: nextOrder, synced: false }));
  }

  moveSectionUp(sectionKey: number): void {
    const order = this.sectionOrder();
    const idx = order.indexOf(sectionKey);
    this.moveSection(idx, idx - 1);
  }

  moveSectionDown(sectionKey: number): void {
    const order = this.sectionOrder();
    const idx = order.indexOf(sectionKey);
    this.moveSection(idx, idx + 1);
  }

  private moveSection(from: number, to: number): void {
    const current = this.sectionOrder();
    if (from < 0 || to < 0 || to >= current.length || from === to) return;
    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    this.sectionOrder.set(next);
  }

  // Vertical drag: which row the pointer is over is read straight from the
  // DOM (row heights vary with chord count/wrapping, unlike the fixed-width
  // beat math used for horizontal chord dragging above).
  onSectionReorderDragStart(event: PointerEvent, sectionKey: number): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).focus();
    const host: HTMLElement = this.elementRef.nativeElement;
    const rows: HTMLElement[] = Array.from(host.querySelectorAll('.backing-track-section-row'));
    let currentIndex = this.sectionOrder().indexOf(sectionKey);
    const onMove = (e: PointerEvent) => {
      const targetIndex = rows.findIndex((row) => {
        const rect = row.getBoundingClientRect();
        return e.clientY >= rect.top && e.clientY <= rect.bottom;
      });
      if (targetIndex !== -1 && targetIndex !== currentIndex) {
        this.moveSection(currentIndex, targetIndex);
        currentIndex = targetIndex;
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  private updateSectionState(key: number, updater: (s: SectionState) => SectionState): void {
    this.sectionStates.update((map) => {
      const existing = map.get(key);
      if (!existing) return map;
      const next = new Map(map);
      next.set(key, updater(existing));
      return next;
    });
  }

  onResizeDragStart(event: PointerEvent, sectionKey: number, slot: number): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).focus();
    const section = this.sectionByKey(sectionKey);
    const startX = event.clientX;
    const startBeats = section ? (this.timelineFor(section)[slot]?.beats ?? 1) : 1;
    const onMove = (e: PointerEvent) => {
      const deltaBeats = Math.round((e.clientX - startX) / BEAT_WIDTH_PX);
      this.setBeats(sectionKey, slot, startBeats + deltaBeats);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  onReorderDragStart(event: PointerEvent, sectionKey: number, slot: number): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).focus();
    const startX = event.clientX;
    let currentSlot = slot;
    const startOffset = this.cumulativeBeatsBefore(sectionKey, slot);
    const onMove = (e: PointerEvent) => {
      const deltaBeats = Math.round((e.clientX - startX) / BEAT_WIDTH_PX);
      const targetOffset = Math.max(0, startOffset + deltaBeats);
      const targetSlot = this.slotAtBeatOffset(sectionKey, targetOffset);
      if (targetSlot !== currentSlot) {
        this.moveSlot(sectionKey, currentSlot, targetSlot);
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

  private cumulativeBeatsBefore(sectionKey: number, slot: number): number {
    const section = this.sectionByKey(sectionKey);
    if (!section) return 0;
    return this.timelineFor(section)
      .slice(0, slot)
      .reduce((sum, e) => sum + e.beats, 0);
  }

  private slotAtBeatOffset(sectionKey: number, offset: number): number {
    const section = this.sectionByKey(sectionKey);
    if (!section) return 0;
    const entries = this.timelineFor(section);
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

  // Builds the song's playback plan: each section repeated per its own
  // count, in display order (write order, unless the user dragged a section
  // to reorder it). A section with "repeat forever" plays once through the
  // sections before it, then parks on itself permanently — the plan stops
  // growing right after it, since nothing past it will ever play. With no
  // infinite section, the whole plan loops as a unit.
  private buildPlan(): { sectionKey: number; length: number }[] {
    const steps: { sectionKey: number; length: number }[] = [];
    for (const section of this.orderedSections()) {
      const length = this.totalBeatsFor(section);
      if (length <= 0) continue;
      const state = this.sectionStates().get(section.key);
      const infinite = state?.infinite ?? false;
      const count = infinite ? 1 : Math.min(MAX_REPEAT_COUNT, Math.max(1, state?.repeatCount ?? 1));
      for (let i = 0; i < count; i++) steps.push({ sectionKey: section.key, length });
      if (infinite) break;
    }
    return steps;
  }

  private playbackPositionAt(totalBeatIndex: number): { sectionKey: number; localBeat: number } | null {
    const steps = this.buildPlan();
    if (!steps.length) return null;

    const state = this.sectionStates();
    const lastStep = steps[steps.length - 1];
    const isInfinite = state.get(lastStep.sectionKey)?.infinite ?? false;

    if (!isInfinite) {
      const totalPlanBeats = steps.reduce((sum, s) => sum + s.length, 0);
      let pos = totalBeatIndex % totalPlanBeats;
      for (const step of steps) {
        if (pos < step.length) return { sectionKey: step.sectionKey, localBeat: pos };
        pos -= step.length;
      }
      return null;
    }

    const prefix = steps.slice(0, -1);
    const prefixBeats = prefix.reduce((sum, s) => sum + s.length, 0);
    if (totalBeatIndex < prefixBeats) {
      let pos = totalBeatIndex;
      for (const step of prefix) {
        if (pos < step.length) return { sectionKey: step.sectionKey, localBeat: pos };
        pos -= step.length;
      }
    }
    return { sectionKey: lastStep.sectionKey, localBeat: (totalBeatIndex - prefixBeats) % lastStep.length };
  }

  // Seeks the shared transport straight to the start of this section's first
  // occurrence in the plan, starting playback if it wasn't already running —
  // lets you audition a section without waiting for it to come around.
  jumpToSection(sectionKey: number): void {
    if (!this.tempo.isPlaying()) {
      this.tempo.start();
    }
    let offset = 0;
    for (const step of this.buildPlan()) {
      if (step.sectionKey === sectionKey) {
        this.tempo.seekToBeat(offset);
        return;
      }
      offset += step.length;
    }
  }

  private onBeat(event: BeatEvent): void {
    if (!this.enabled() || !this.activeInstrument) return;
    const position = this.playbackPositionAt(event.totalBeatIndex);
    if (!position) return;
    const section = this.sectionByKey(position.sectionKey);
    if (!section) return;
    const entries = this.timelineFor(section);
    if (!entries.length) return;

    let pos = position.localBeat;
    let slot = entries.length - 1;
    for (let i = 0; i < entries.length; i++) {
      if (pos < entries[i].beats) {
        slot = i;
        break;
      }
      pos -= entries[i].beats;
    }
    const isFirstBeatOfSlot = pos === 0;
    this.scheduleVisualBeat(event.time, position.sectionKey, slot);

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
    const direction = pattern === 'alternating' ? (totalBeatIndex % 2 === 0 ? 'down' : 'up') : 'down';
    const ordered = pattern === 'none' ? midiNotes : direction === 'down' ? midiNotes : [...midiNotes].reverse();
    ordered.forEach((note, i) => {
      const stagger = pattern === 'none' ? 0 : i * STRUM_STAGGER_SECONDS;
      this.activeInstrument!.start({ note, time: time + stagger, duration });
    });
  }

  private scheduleVisualBeat(time: number, sectionKey: number, slot: number): void {
    const delayMs = Math.max(0, (time - this.tempo.audioContext.currentTime) * 1000);
    const onId = setTimeout(() => {
      this.pulseTimeouts.delete(onId);
      this.activeSectionKey.set(sectionKey);
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
    this.activeSectionKey.set(null);
    this.activeSlot.set(null);
    this.beatPulse.set(false);
  }

  ngOnDestroy(): void {
    this.unsubscribeBeat?.();
    this.clearVisualBeat();
  }
}
