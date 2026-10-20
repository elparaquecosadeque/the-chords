import { Component, inject } from '@angular/core';
import { CountInPractice } from '@gblp/count-in-practice';

import { PreferencesService } from './preferences.service';

@Component({
  imports: [CountInPractice],
  template: `<the-chords-count-in-practice [language]="preferences.language()" />`,
})
export class CountInPracticePage {
  readonly preferences = inject(PreferencesService);
}
