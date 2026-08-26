import { Injectable, signal } from '@angular/core';

export interface BeatEvent {
  time: number;
  beatIndex: number;
  measureIndex: number;
  isAccent: boolean;
  // Beats elapsed since the transport last started, ignoring measure
  // boundaries — unlike measureIndex/beatIndex, unaffected by beatsPerMeasure
  // changing mid-playback. Lets consumers (e.g. the backing track's timeline)
  // work in plain beat counts instead of bars.
  totalBeatIndex: number;
}

export type BeatListener = (event: BeatEvent) => void;

// Shared Web Audio lookahead-scheduler clock (classic Chris Wilson pattern): a
// ~25ms setInterval tick schedules events ~100ms ahead against
// audioCtx.currentTime, avoiding setInterval drift. One instance (providedIn:
// 'root') drives both the metronome click and the backing-track piano so they
// stay on the same beat.
@Injectable({ providedIn: 'root' })
export class TempoService {
  readonly bpm = signal(120);
  readonly beatsPerMeasure = signal(4);
  readonly isPlaying = signal(false);

  private audioCtx: AudioContext | null = null;
  private schedulerId: number | null = null;
  private nextNoteTime = 0;
  private beatIndex = 0;
  private measureIndex = 0;
  private totalBeatIndex = 0;
  private readonly listeners = new Set<BeatListener>();
  private readonly lookaheadMs = 25;
  private readonly scheduleAheadTime = 0.1;

  get audioContext(): AudioContext {
    this.audioCtx ??= new AudioContext();
    return this.audioCtx;
  }

  onBeat(listener: BeatListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  toggle(): void {
    if (this.isPlaying()) {
      this.stop();
    } else {
      this.start();
    }
  }

  // Re-align so the next scheduled click lands on beat 1, instead of landing
  // mid-measure against a just-changed time signature.
  realignToMeasureStart(): void {
    this.beatIndex = 0;
  }

  start(): void {
    const ctx = this.audioContext;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    this.nextNoteTime = ctx.currentTime;
    this.beatIndex = 0;
    this.measureIndex = 0;
    this.totalBeatIndex = 0;
    this.isPlaying.set(true);
    this.schedulerId = window.setInterval(() => this.scheduler(), this.lookaheadMs);
  }

  stop(): void {
    this.isPlaying.set(false);
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private scheduler(): void {
    if (!this.audioCtx) return;
    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      const event: BeatEvent = {
        time: this.nextNoteTime,
        beatIndex: this.beatIndex,
        measureIndex: this.measureIndex,
        isAccent: this.beatIndex === 0,
        totalBeatIndex: this.totalBeatIndex,
      };
      for (const listener of this.listeners) listener(event);
      this.beatIndex++;
      this.totalBeatIndex++;
      if (this.beatIndex >= this.beatsPerMeasure()) {
        this.beatIndex = 0;
        this.measureIndex++;
      }
      this.nextNoteTime += 60 / this.bpm();
    }
  }
}
