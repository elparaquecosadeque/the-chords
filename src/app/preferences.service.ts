import { effect, Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';
export type Language = 'en' | 'es';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  readonly theme = signal<Theme>(
    localStorage.getItem('the-chords-theme') === 'light' ? 'light' : 'dark',
  );
  readonly language = signal<Language>(
    localStorage.getItem('the-chords-language') === 'es' ? 'es' : 'en',
  );
  readonly showRhythmCirclePreview = signal<boolean>(
    localStorage.getItem('the-chords-show-circle-preview') === 'true',
  );
  // Modal interchange's hover-to-preview toggle — defaults on (matches the
  // feature's own default), everywhere else here defaults off.
  readonly interchangeHoverPreview = signal<boolean>(
    localStorage.getItem('the-chords-interchange-hover-preview') !== 'false',
  );

  constructor() {
    effect(() => localStorage.setItem('the-chords-theme', this.theme()));
    effect(() => localStorage.setItem('the-chords-language', this.language()));
    effect(() =>
      localStorage.setItem('the-chords-show-circle-preview', String(this.showRhythmCirclePreview())),
    );
    effect(() =>
      localStorage.setItem('the-chords-interchange-hover-preview', String(this.interchangeHoverPreview())),
    );
  }
}
