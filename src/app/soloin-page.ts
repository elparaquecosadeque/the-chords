import { Component, OnDestroy, inject, signal } from '@angular/core';
import { SoloinComponent, type SoloinBeatEvent } from '@gblp/soloin';

import { PreferencesService } from './preferences.service';
import { TempoService } from './tempo.service';

@Component({
  imports: [SoloinComponent],
  template: `
    <the-chords-soloin
      [language]="preferences.language()"
      [beatEvent]="beatEvent()"
      [transportPlaying]="tempo.isPlaying()"
    />
  `,
})
export class SoloinPage implements OnDestroy {
  readonly preferences = inject(PreferencesService);
  readonly tempo = inject(TempoService);

  // Forwarded to Soloin's Practice mode so it can step in time with the same
  // transport the topbar's metronome drives, instead of running its own clock.
  readonly beatEvent = signal<SoloinBeatEvent | null>(null);
  private readonly unsubscribeBeat = this.tempo.onBeat((event) =>
    this.beatEvent.set({ totalBeatIndex: event.totalBeatIndex, isAccent: event.isAccent }),
  );

  ngOnDestroy(): void {
    this.unsubscribeBeat();
  }
}
