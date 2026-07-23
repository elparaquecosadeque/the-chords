import { Component, inject } from '@angular/core';
import { BassNotesPage } from '@gblp/bass-notes';

import { PreferencesService } from './preferences.service';

@Component({
  imports: [BassNotesPage],
  template: `<app-bass-notes [language]="preferences.language()" />`,
})
export class BassNotesPageWrapper {
  readonly preferences = inject(PreferencesService);
}
