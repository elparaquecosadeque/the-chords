import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { BassNotesPage } from '@gblp/bass-notes';
import { CircleOfFifthsComponent, CircleOfFifthsWheel } from '@gblp/circle-of-fifths';
import { ChordFinderComponent } from '@gblp/chord-finder';
import { detectKey } from '@gblp/music-theory';
import { SoloinComponent } from '@gblp/soloin';

import { LocalizationService } from './localization.service';
import { PreferencesService } from './preferences.service';

type ComposeTab = 'rhythm' | 'theory' | 'solo' | 'bass';

const TABS: ComposeTab[] = ['rhythm', 'theory', 'solo', 'bass'];

// circle-of-fifths orders keys by fifths, not chromatically — fixed 12-entry lookup, see its KEYS table.
const MAJOR_PC_TO_CIRCLE_INDEX: Record<number, number> = {
  0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 1: 7, 8: 8, 3: 9, 10: 10, 5: 11,
};
const MINOR_PC_TO_CIRCLE_INDEX: Record<number, number> = {
  9: 0, 4: 1, 11: 2, 6: 3, 1: 4, 8: 5, 3: 6, 10: 7, 5: 8, 0: 9, 7: 10, 2: 11,
};

@Component({
  imports: [ChordFinderComponent, CircleOfFifthsComponent, CircleOfFifthsWheel, SoloinComponent, BassNotesPage],
  templateUrl: './compose-page.html',
  styleUrl: './compose-page.scss',
})
export class ComposePage {
  readonly preferences = inject(PreferencesService);
  readonly localization = inject(LocalizationService);

  readonly tabs = TABS;
  readonly activeTab = signal<ComposeTab>('rhythm');

  private readonly chordFinder = viewChild(ChordFinderComponent);
  private readonly circle = viewChild(CircleOfFifthsComponent);
  private readonly soloin = viewChild(SoloinComponent);
  private readonly bass = viewChild(BassNotesPage);

  // Live (not seed-once) — feeds the read-only circle preview next to Chord Finder while the
  // user types. The seeded Theory-tab circle below stays seed-once so manual key picks stick.
  private readonly liveDetectedKey = computed(() => {
    const query = this.chordFinder()?.query() ?? '';
    const chords = query.split(',').map((c) => c.trim()).filter(Boolean);
    return detectKey(chords);
  });

  readonly liveCircleIndex = computed(() => {
    const key = this.liveDetectedKey();
    if (!key) return null;
    const index =
      key.mode === 'major' ? MAJOR_PC_TO_CIRCLE_INDEX[key.root] : MINOR_PC_TO_CIRCLE_INDEX[key.root];
    return index ?? null;
  });

  readonly liveCircleType = computed(() => this.liveDetectedKey()?.mode ?? null);

  // ponytail: Soloin/Bass Notes ship with their own non-empty demo progression, so "seed only if
  // target is empty" never fires for them. Track seeding explicitly per tab instead, once per page load.
  private readonly seededTabs = new Set<ComposeTab>();

  setTab(tab: ComposeTab): void {
    this.activeTab.set(tab);
    this.seedFromRhythm(tab);
  }

  private seedFromRhythm(tab: ComposeTab): void {
    if (tab === 'rhythm' || this.seededTabs.has(tab)) return;
    const progression = this.chordFinder()?.query()?.trim();
    if (!progression) return;
    this.seededTabs.add(tab);

    if (tab === 'theory') {
      const circle = this.circle();
      if (!circle) return;
      const key = detectKey(progression.split(',').map((c) => c.trim()).filter(Boolean));
      if (!key) return;
      const index =
        key.mode === 'major' ? MAJOR_PC_TO_CIRCLE_INDEX[key.root] : MINOR_PC_TO_CIRCLE_INDEX[key.root];
      if (index === undefined) return;
      circle.selectKey(index, key.mode);
    } else if (tab === 'solo') {
      const soloin = this.soloin();
      if (!soloin) return;
      soloin.mode.set('progression');
      soloin.progressionInput.set(progression);
    } else if (tab === 'bass') {
      const bass = this.bass();
      if (!bass) return;
      bass.input.set(progression.replace(/,\s*/g, ' '));
    }
  }
}
