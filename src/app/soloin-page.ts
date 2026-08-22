import { Component, inject } from '@angular/core';
import { SoloinComponent } from '@gblp/soloin';

import { PreferencesService } from './preferences.service';

@Component({
  imports: [SoloinComponent],
  template: `<the-chords-soloin [language]="preferences.language()" />`,
})
export class SoloinPage {
  readonly preferences = inject(PreferencesService);
}
