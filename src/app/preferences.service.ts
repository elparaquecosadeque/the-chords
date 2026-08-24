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
  readonly alwaysShowDiagrams = signal<boolean>(
    localStorage.getItem('the-chords-always-show-diagrams') === 'true',
  );

  constructor() {
    effect(() => localStorage.setItem('the-chords-theme', this.theme()));
    effect(() => localStorage.setItem('the-chords-language', this.language()));
    effect(() =>
      localStorage.setItem('the-chords-show-circle-preview', String(this.showRhythmCirclePreview())),
    );
    effect(() =>
      localStorage.setItem('the-chords-always-show-diagrams', String(this.alwaysShowDiagrams())),
    );
  }
}
