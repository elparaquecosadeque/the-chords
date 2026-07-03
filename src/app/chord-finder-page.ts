import { Component, inject } from '@angular/core';
import { ChordFinderComponent } from '@gblp/chord-finder';

import { PreferencesService } from './preferences.service';

@Component({
  imports: [ChordFinderComponent],
  template: `<the-chords-chord-finder [language]="preferences.language()" />`,
})
export class ChordFinderPage {
  readonly preferences = inject(PreferencesService);
}
