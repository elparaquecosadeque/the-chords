import { Component, OnDestroy, inject, signal } from '@angular/core';

import { LocalizationService } from './localization.service';

@Component({
  selector: 'app-metronome',
  imports: [],
  templateUrl: './metronome.html',
  styleUrl: './metronome.scss',
})
export class Metronome implements OnDestroy {
  private readonly localization = inject(LocalizationService);
  readonly text = this.localization.languageDictionary;

  readonly bpm = signal(120);
  readonly isPlaying = signal(false);

  private audioCtx: AudioContext | null = null;
  private schedulerId: number | null = null;
  private nextNoteTime = 0;
  private readonly lookaheadMs = 25;
  private readonly scheduleAheadTime = 0.1;

  toggle(): void {
    if (this.isPlaying()) {
      this.stop();
    } else {
      this.start();
    }
  }

  onBpmChange(value: string): void {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      this.bpm.set(Math.min(240, Math.max(40, parsed)));
    }
  }

  private start(): void {
    this.audioCtx ??= new AudioContext();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    this.nextNoteTime = this.audioCtx.currentTime;
    this.isPlaying.set(true);
    this.schedulerId = window.setInterval(() => this.scheduler(), this.lookaheadMs);
  }

  private stop(): void {
    this.isPlaying.set(false);
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private scheduler(): void {
    if (!this.audioCtx) return;
    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.playClick(this.nextNoteTime);
      this.nextNoteTime += 60 / this.bpm();
    }
  }

  private playClick(time: number): void {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain).connect(this.audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  ngOnDestroy(): void {
    this.stop();
    this.audioCtx?.close();
  }
}
