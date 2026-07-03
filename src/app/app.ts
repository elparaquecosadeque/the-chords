import { DOCUMENT, UpperCasePipe } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { PreferencesService } from './preferences.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, UpperCasePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly document = inject(DOCUMENT);
  readonly preferences = inject(PreferencesService);
  readonly copy = computed(() =>
    this.preferences.language() === 'es'
      ? {
          navLabel: 'Herramientas de acordes',
          chordFinder: 'Buscador de acordes',
          circleOfFifths: 'Círculo de quintas',
          homeLabel: 'Inicio de The Chords',
          darkTheme: 'Tema oscuro',
          lightTheme: 'Tema claro',
          language: 'Cambiar idioma',
          repository: 'Repositorio de The Chords',
          socialLinks: 'Perfiles sociales',
          githubProfile: 'Perfil de GitHub de Bruno Leon',
          linkedinProfile: 'Perfil de LinkedIn de Bruno Leon',
          attribution: 'hecho con metodología HitL bajo la supervisión de',
        }
      : {
          navLabel: 'Chord tools',
          chordFinder: 'Chord Finder',
          circleOfFifths: 'Circle of Fifths',
          homeLabel: 'The Chords home',
          darkTheme: 'Dark theme',
          lightTheme: 'Light theme',
          language: 'Change language',
          repository: 'The Chords repository',
          socialLinks: 'Social profiles',
          githubProfile: 'Bruno Leon on GitHub',
          linkedinProfile: 'Bruno Leon on LinkedIn',
          attribution: 'made with HitL methodology with supervision of',
        },
  );

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
