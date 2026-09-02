import { DOCUMENT, UpperCasePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import type { ComposeTab } from './compose-page';
import { InfoModal } from './info-modal';
import { LocalizationService } from './localization.service';
import { Metronome } from './metronome';
import { PreferencesService } from './preferences.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, UpperCasePipe, Metronome, InfoModal],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  readonly preferences = inject(PreferencesService);
  readonly localization = inject(LocalizationService);
  readonly languageLocalization = this.localization.languageDictionary;

  // Drives the info modal's contextual content — which route (and, for compose,
  // which tab) the user is actually looking at right now.
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  readonly activeRouteKey = computed(() => this.currentUrl().split('/')[1]?.split(/[?#]/)[0] ?? '');

  // Duck-typed instead of an `instanceof ComposePage` check so app.ts never imports
  // the (lazy-loaded) compose-page module — that import would pull its whole chunk
  // into the eager main bundle and defeat the route-level code splitting.
  private readonly activatedComponent = signal<{ activeTab?: () => ComposeTab } | null>(null);
  readonly composeActiveTab = computed<ComposeTab | null>(() =>
    this.activeRouteKey() === 'compose' ? (this.activatedComponent()?.activeTab?.() ?? null) : null,
  );

  readonly infoOpen = signal(false);

  constructor() {
    effect(() => (this.document.documentElement.lang = this.preferences.language()));
  }

  onRouteActivate(component: unknown): void {
    this.activatedComponent.set(component as { activeTab?: () => ComposeTab } | null);
  }

  toggleTheme(): void {
    this.preferences.theme.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }

  toggleLanguage(): void {
    this.preferences.language.update((language) => (language === 'en' ? 'es' : 'en'));
  }
}
