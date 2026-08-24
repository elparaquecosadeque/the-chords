import { DOCUMENT, UpperCasePipe } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { LocalizationService } from './localization.service';
import { Metronome } from './metronome';
import { PreferencesService } from './preferences.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, UpperCasePipe, Metronome],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly document = inject(DOCUMENT);
  readonly preferences = inject(PreferencesService);
  readonly localization = inject(LocalizationService);
  readonly languageLocalization = this.localization.languageDictionary;

  constructor() {
    effect(() => (this.document.documentElement.lang = this.preferences.language()));
  }

  toggleTheme(): void {
    this.preferences.theme.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }

  toggleLanguage(): void {
    this.preferences.language.update((language) => (language === 'en' ? 'es' : 'en'));
  }
}
