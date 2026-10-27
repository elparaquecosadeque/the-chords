import { Component, computed, effect, inject, signal } from '@angular/core';
import { ChordFinderComponent } from '@gblp/chord-finder';
import { CountInPractice } from '@gblp/count-in-practice';

import { LocalizationService } from './localization.service';
import { PreferencesService } from './preferences.service';

const CHORDS_KEY = 'the-chords-count-in-chords';
const CHORDS_OPEN_KEY = 'the-chords-count-in-chords-open';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the panel just won't remember.
  }
}

// Count-In with the chords being practiced beside it (below, on narrow
// screens). The panel collapses to a one-line chip for when only the loop
// matters, still naming the chords.
@Component({
  imports: [CountInPractice, ChordFinderComponent],
  template: `
    <section class="count-in">
      <header class="count-in-header">
        <h1>{{ text().title }}</h1>
        <p>{{ text().intro }}</p>
      </header>

      <div class="count-in-layout">
        <the-chords-count-in-practice [language]="preferences.language()" [theme]="preferences.theme()" [showHeader]="false" />

        <details class="chords-panel" [open]="chordsOpen()" (toggle)="onToggle($event)">
          <summary>
            <span class="chords-title">{{ text().chords }}</span>
            @if (!chordsOpen()) {
              <span class="chords-summary">{{ chordsSummary() }}</span>
            }
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </summary>
          <the-chords-chord-finder compact [language]="preferences.language()" [(query)]="chords" />
        </details>
      </div>
    </section>
  `,
  styleUrl: './count-in-practice-page.scss',
})
export class CountInPracticePage {
  readonly preferences = inject(PreferencesService);
  private readonly localization = inject(LocalizationService);
  readonly text = computed(() => this.localization.languageDictionary().countInPage);

  readonly chords = signal(read(CHORDS_KEY) ?? 'C, G, Am, F');
  readonly chordsOpen = signal(read(CHORDS_OPEN_KEY) !== 'false');
  // "verse: C, G; chorus: Am" → "C · G / Am"
  readonly chordsSummary = computed(() =>
    this.chords()
      .split(';')
      .map((section) =>
        section
          .replace(/^[^:]*:/, '')
          .split(',')
          .map((chord) => chord.trim())
          .filter(Boolean)
          .join(' · '),
      )
      .filter(Boolean)
      .join(' / '),
  );

  constructor() {
    effect(() => write(CHORDS_KEY, this.chords()));
  }

  onToggle(event: Event): void {
    const open = (event.target as HTMLDetailsElement).open;
    this.chordsOpen.set(open);
    write(CHORDS_OPEN_KEY, String(open));
  }
}
