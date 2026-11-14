import { DOCUMENT, UpperCasePipe } from '@angular/common';
import {
  Component,
  Injector,
  ViewContainerRef,
  afterNextRender,
  computed,
  effect,
  inject,
  inputBinding,
  outputBinding,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { CountInEngineService, CountInStore } from '@gblp/count-in-practice';
import { filter, map } from 'rxjs';

import type { ComposeTab } from './compose-page';
import { markCountInHostReady } from './count-in-session';
import { InfoModal } from './info-modal';
import { LocalizationService } from './localization.service';
import { Metronome } from './metronome';
import { PreferencesService } from './preferences.service';
import { SessionsPanel } from './sessions-panel';
import { TempoService } from './tempo.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, UpperCasePipe, Metronome, InfoModal, SessionsPanel],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly document = inject(DOCUMENT);
  readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly tempo = inject(TempoService);
  // Null until the Count-In lib has loaded (see loadCountIn).
  readonly countInEngine = signal<CountInEngineService | null>(null);
  private readonly countInHostOutlet = viewChild.required('countInHost', { read: ViewContainerRef });
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
  readonly sessionsOpen = signal(false);

  // Mobile-only topbar collapse state — both ignored by desktop CSS, where
  // the nav and preferences stay permanently expanded regardless.
  readonly mobileNavOpen = signal(false);
  readonly mobileSettingsOpen = signal(false);

  // The label shown on the collapsed mobile tool switcher, next to "The
  // Chords" — mirrors whichever nav link's routerLinkActive is lit.
  readonly activeToolLabel = computed(() => {
    const t = this.languageLocalization();
    const labels: Record<string, string> = {
      'chord-finder': t.chordFinder,
      'circle-of-fifths': t.circleOfFifths,
      'bass-notes': t.bassNotes,
      soloin: t.soloin,
      'count-in': t.countIn,
      compose: t.compose,
    };
    return labels[this.activeRouteKey()] ?? t.chordFinder;
  });

  constructor() {
    effect(() => (this.document.documentElement.lang = this.preferences.language()));
    // Mirrors .shell's [data-theme] onto <html> so global (non-component-scoped)
    // CSS — like the driver.js walkthrough theming in styles.scss — can react to
    // the theme too, since driver.js appends its popover as a sibling of <app-root>.
    effect(() => (this.document.documentElement.dataset['theme'] = this.preferences.theme()));
    afterNextRender(() => this.loadCountIn());
  }

  // Count-In keeps playing across routes, so its YouTube host lives in the
  // shell. Imported dynamically: a static import would put the whole lib
  // (waveform editor included) in the initial bundle.
  private async loadCountIn(): Promise<void> {
    const { CountInEngineService, CountInStore, CountInYoutubeHost } = await import('@gblp/count-in-practice');
    const engine = this.injector.get(CountInEngineService);
    this.countInHostOutlet().createComponent(CountInYoutubeHost, {
      bindings: [
        inputBinding('language', this.preferences.language),
        inputBinding('theme', this.preferences.theme),
        outputBinding('returnRequested', () => this.router.navigate(['/count-in'])),
      ],
    });
    this.syncCountInWithMetronome(engine, this.injector.get(CountInStore));
    this.countInEngine.set(engine);
    markCountInHostReady();
  }

  // Count-In and the navbar metronome share tempo and meter, and only one of
  // them plays at a time. Count-In's (persisted) values win at startup; the
  // metronome only writes back while the loop is idle, so a running loop never
  // changes speed under the player.
  private syncCountInWithMetronome(engine: CountInEngineService, store: CountInStore): void {
    const options = { injector: this.injector };
    effect(() => {
      const bpm = store.bpm();
      const beats = store.beatsPerMeasure();
      untracked(() => {
        this.tempo.bpm.set(bpm);
        this.tempo.beatsPerMeasure.set(beats);
      });
    }, options);
    effect(() => {
      const bpm = this.tempo.bpm();
      const beats = this.tempo.beatsPerMeasure();
      untracked(() => {
        if (engine.transport() !== 'idle') return;
        store.bpm.set(bpm);
        store.beatsPerMeasure.set(beats);
      });
    }, options);
    effect(() => {
      if (engine.transport() === 'playing') untracked(() => this.tempo.isPlaying() && this.tempo.stop());
    }, options);
    effect(() => {
      if (this.tempo.isPlaying()) untracked(() => engine.transport() !== 'idle' && engine.stop());
    }, options);
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

  toggleMobileNav(): void {
    this.mobileSettingsOpen.set(false);
    this.mobileNavOpen.update((open) => !open);
  }

  toggleMobileSettings(): void {
    this.mobileNavOpen.set(false);
    this.mobileSettingsOpen.update((open) => !open);
  }
}
