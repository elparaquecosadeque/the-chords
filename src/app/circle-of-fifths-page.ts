import { Component, inject } from '@angular/core';
import { CircleOfFifthsComponent } from '@gblp/circle-of-fifths';

import { PreferencesService } from './preferences.service';

@Component({
  imports: [CircleOfFifthsComponent],
  template: `<the-chords-circle-of-fifths [language]="preferences.language()" />`,
})
export class CircleOfFifthsPage {
  readonly preferences = inject(PreferencesService);
}
