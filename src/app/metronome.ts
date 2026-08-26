import { Component, ElementRef, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';

import { LocalizationService } from './localization.service';
import { TempoService } from './tempo.service';

@Component({
  selector: 'app-metronome',
  imports: [],
  templateUrl: './metronome.html',
  styleUrl: './metronome.scss',
})
export class Metronome implements OnDestroy {
  private readonly localization = inject(LocalizationService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly tempo = inject(TempoService);
  readonly text = this.localization.languageDictionary;

  readonly bpm = this.tempo.bpm;
  readonly bpmInputValue = signal(String(this.tempo.bpm()));
  readonly isPlaying = this.tempo.isPlaying;
  // Drives a CSS pulse timed to the beat (approximate, not audio-sample-synced —
  // sufficient as a visual "it's alive" cue without wiring the animation to the
  // lookahead audio scheduler itself).
  readonly beatSeconds = computed(() => `${(60 / this.bpm()).toFixed(3)}s`);

  readonly timeSignatures = [
    { label: '2/4', beats: 2 },
    { label: '3/4', beats: 3 },
    { label: '4/4', beats: 4 },
    { label: '5/4', beats: 5 },
    { label: '6/8', beats: 6 },
    { label: '7/8', beats: 7 },
  ] as const;
  readonly beatsPerMeasure = this.tempo.beatsPerMeasure;
  // Flips true for a moment on beat 1 of each measure, timed to actual audio
  // playback (not schedule time) so the visual accent lines up with the click.
  readonly accentPulse = signal(false);

  // 0–1. Old fixed 0.4/0.5 peaks read as quiet — there's real headroom below
  // Web Audio's unity gain of 1.0, so the default here sits well above those.
  readonly volume = signal(0.8);
  readonly volumeOpen = signal(false);

  private readonly pulseTimeouts = new Set<ReturnType<typeof setTimeout>>();
  private readonly unsubscribeBeat: () => void;

  constructor() {
    this.unsubscribeBeat = this.tempo.onBeat((event) => {
      this.playClick(event.time, event.isAccent);
      this.scheduleVisualPulse(event.time, event.isAccent);
    });
  }

  toggle(): void {
    this.tempo.toggle();
    if (!this.tempo.isPlaying()) {
      for (const id of this.pulseTimeouts) clearTimeout(id);
      this.pulseTimeouts.clear();
      this.accentPulse.set(false);
    }
  }

  onBpmInput(value: string): void {
    // Track the raw text as-is while typing — don't clamp or rewrite the field
    // mid-entry, or the DOM value fights the user's cursor (e.g. clearing the
    // field then typing "90" digit-by-digit used to land on "240").
    this.bpmInputValue.set(value);
    const parsed = Number(value);
    if (value.trim() !== '' && !Number.isNaN(parsed) && parsed >= 40 && parsed <= 240) {
      this.bpm.set(parsed);
    }
  }

  onBpmBlur(): void {
    const parsed = Number(this.bpmInputValue());
    const clamped = Number.isNaN(parsed) ? this.bpm() : Math.min(240, Math.max(40, parsed));
    this.bpm.set(clamped);
    this.bpmInputValue.set(String(clamped));
  }

  onTimeSignatureChange(value: string): void {
    this.beatsPerMeasure.set(Number(value));
    this.tempo.realignToMeasureStart();
  }

  toggleVolumePopover(): void {
    this.volumeOpen.update((v) => !v);
  }

  onVolumeInput(value: string): void {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      this.volume.set(Math.min(1, Math.max(0, parsed / 100)));
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.volumeOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.volumeOpen.set(false);
    }
  }

  private playClick(time: number, isAccent: boolean): void {
    const audioCtx = this.tempo.audioContext;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = isAccent ? 1600 : 1000;
    const baseGain = this.volume() * 0.9;
    const peakGain = isAccent ? Math.min(1, baseGain * 1.25) : baseGain;
    gain.gain.setValueAtTime(peakGain, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  private scheduleVisualPulse(time: number, isAccent: boolean): void {
    if (!isAccent) return;
    const delayMs = Math.max(0, (time - this.tempo.audioContext.currentTime) * 1000);
    const onId = setTimeout(() => {
      this.pulseTimeouts.delete(onId);
      this.accentPulse.set(true);
      const offId = setTimeout(() => {
        this.pulseTimeouts.delete(offId);
        this.accentPulse.set(false);
      }, 150);
      this.pulseTimeouts.add(offId);
    }, delayMs);
    this.pulseTimeouts.add(onId);
  }

  ngOnDestroy(): void {
    this.unsubscribeBeat();
    for (const id of this.pulseTimeouts) clearTimeout(id);
    this.pulseTimeouts.clear();
  }
}
