import { Component, inject, signal } from '@angular/core';
import { BassNotesPage } from '@gblp/bass-notes';
import { CircleOfFifthsComponent } from '@gblp/circle-of-fifths';
import { ChordFinderComponent } from '@gblp/chord-finder';
import { SoloinComponent } from '@gblp/soloin';

import { LocalizationService } from './localization.service';
import { PreferencesService } from './preferences.service';

type ComposeTab = 'rhythm' | 'theory' | 'solo' | 'bass';

const TABS: ComposeTab[] = ['rhythm', 'theory', 'solo', 'bass'];

@Component({
  imports: [ChordFinderComponent, CircleOfFifthsComponent, SoloinComponent, BassNotesPage],
  templateUrl: './compose-page.html',
  styleUrl: './compose-page.scss',
})
export class ComposePage {
  readonly preferences = inject(PreferencesService);
  readonly localization = inject(LocalizationService);

  readonly tabs = TABS;
  readonly activeTab = signal<ComposeTab>('rhythm');

  setTab(tab: ComposeTab): void {
    this.activeTab.set(tab);
  }
}
