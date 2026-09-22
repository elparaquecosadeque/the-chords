import { Component, computed, effect, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BassNotesPage } from '@gblp/bass-notes';
import { CircleOfFifthsComponent, CircleOfFifthsWheel } from '@gblp/circle-of-fifths';
import { ChordFinderComponent } from '@gblp/chord-finder';
import { detectKey } from '@gblp/music-theory';
import { SoloinComponent, type SoloinSessionState } from '@gblp/soloin';
import { filter } from 'rxjs';

import { BackingTrack, type BackingTrackInitialState } from './backing-track';
import { LocalizationService } from './localization.service';
import { PreferencesService } from './preferences.service';
import { decodeSession, encodeSession, type SavedSessionData, type SavedSessionSolo } from './session-codec';
import { SessionsService } from './sessions.service';
import { TempoService } from './tempo.service';

export type ComposeTab = 'rhythm' | 'theory' | 'solo' | 'bass';

const TABS: ComposeTab[] = ['rhythm', 'theory', 'solo', 'bass'];

// circle-of-fifths orders keys by fifths, not chromatically — fixed 12-entry lookup, see its KEYS table.
const MAJOR_PC_TO_CIRCLE_INDEX: Record<number, number> = {
  0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 1: 7, 8: 8, 3: 9, 10: 10, 5: 11,
};
const MINOR_PC_TO_CIRCLE_INDEX: Record<number, number> = {
  9: 0, 4: 1, 11: 2, 6: 3, 1: 4, 8: 5, 3: 6, 10: 7, 5: 8, 0: 9, 7: 10, 2: 11,
};

@Component({
  imports: [
    ChordFinderComponent,
    CircleOfFifthsComponent,
    CircleOfFifthsWheel,
    SoloinComponent,
    BassNotesPage,
    BackingTrack,
    FormsModule,
  ],
  templateUrl: './compose-page.html',
  styleUrl: './compose-page.scss',
})
export class ComposePage {
  readonly preferences = inject(PreferencesService);
  readonly localization = inject(LocalizationService);
  private readonly tempo = inject(TempoService);
  private readonly sessionsService = inject(SessionsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly tabs = TABS;
  readonly activeTab = signal<ComposeTab>('rhythm');

  private readonly chordFinder = viewChild(ChordFinderComponent);
  private readonly circle = viewChild(CircleOfFifthsComponent);
  private readonly soloin = viewChild(SoloinComponent);
  private readonly bass = viewChild(BassNotesPage);
  private readonly backingTrack = viewChild(BackingTrack);
  private readonly saveSessionWrap = viewChild<ElementRef<HTMLElement>>('saveSessionWrap');

  // Live (not seed-once) — feeds the read-only circle preview next to Chord Finder while the
  // user types. The seeded Theory-tab circle below stays seed-once so manual key picks stick.
  private readonly liveDetectedKey = computed(() => {
    const query = this.chordFinder()?.query() ?? '';
    const chords = query.split(',').map((c) => c.trim()).filter(Boolean);
    return detectKey(chords);
  });

  readonly liveCircleIndex = computed(() => {
    const key = this.liveDetectedKey();
    if (!key) return null;
    const index =
      key.mode === 'major' ? MAJOR_PC_TO_CIRCLE_INDEX[key.root] : MINOR_PC_TO_CIRCLE_INDEX[key.root];
    return index ?? null;
  });

  readonly liveCircleType = computed(() => this.liveDetectedKey()?.mode ?? null);

  // Feeds the backing track, which stays mounted across tabs (transversal to the
  // 4-tab flow) — reads the same live Rhythm-tab query as the circle preview above.
  readonly rhythmProgression = computed(() => this.chordFinder()?.query() ?? '');

  // ponytail: Soloin/Bass Notes ship with their own non-empty demo progression, so "seed only if
  // target is empty" never fires for them. Track seeding explicitly per tab instead, once per page load.
  private readonly seededTabs = new Set<ComposeTab>();

  // A jam session (BPM, time signature, progression, backing-track state) restored
  // from the `s` query param — loading one from the navbar list navigates here with
  // the same param, so a shared link and a saved session go through one path.
  readonly backingTrackInitialState = signal<BackingTrackInitialState | null>(null);
  readonly saveNameOpen = signal(false);
  readonly saveNameValue = signal('');
  private pendingProg: string | null = null;
  // Same reason as pendingProg: Soloin's panel is a viewChild that only resolves after
  // the first render. `state: null` means "reset Soloin to its defaults".
  private pendingSolo: { state: SoloinSessionState | null } | null = null;
  // Set right before this page navigates to its own URL (see confirmSaveSession) so the
  // query-param effect below doesn't re-apply what it just captured. Any other change to
  // `s` — a deep link, a different saved session, even re-picking the active one now that
  // onSameUrlNavigation is 'reload' — always applies.
  private skipNextApply = false;

  constructor() {
    // This component's own creation was already navigated to by the time its
    // constructor runs (that's why the route matched) — a plain event
    // subscription below would miss that first navigation entirely, so its
    // param is applied directly, once, up front.
    const initialParam = this.route.snapshot.queryParamMap.get('s');
    if (initialParam) {
      const initialSession = decodeSession(initialParam);
      if (initialSession) this.applySession(initialSession);
    }

    // Every navigation AFTER that one — a fresh deep link isn't one of these,
    // it's the constructor-time case above, but a different saved session, or
    // even re-picking the currently-active one (onSameUrlNavigation:'reload'
    // makes that a real NavigationEnd instead of being silently ignored). A
    // signal here would be the wrong tool: two identical `s` values are
    // `Object.is`-equal, so a signal derived from them would never notice the
    // second navigation happened at all — this subscribes to the router's
    // NavigationEnd events directly instead, which are distinct objects every
    // time regardless of what the resulting URL is.
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.skipNextApply) {
          this.skipNextApply = false;
          return;
        }
        const param = this.route.snapshot.queryParamMap.get('s');
        if (!param) return;
        const session = decodeSession(param);
        if (!session) return;
        this.applySession(session);
      });

    // The Rhythm tab's chord-finder is only reachable once its view exists
    // (a viewChild, unlike the plain input() above) — apply a still-pending
    // progression as soon as it resolves.
    effect(() => {
      const chordFinder = this.chordFinder();
      if (!chordFinder || this.pendingProg === null) return;
      chordFinder.query.set(this.pendingProg);
      chordFinder.runSearch();
      this.pendingProg = null;
    });

    effect(() => {
      const soloin = this.soloin();
      if (!soloin || !this.pendingSolo) return;
      const { state } = this.pendingSolo;
      this.pendingSolo = null;
      this.restoreSolo(soloin, state);
    });
  }

  // A session that carries Soloin state restores it (Key mode, marks, tuning…) and marks
  // the Solo tab as already seeded, so the one-time seed from Rhythm doesn't overwrite it.
  // A session without it puts Soloin back to defaults but leaves the seed untouched.
  private restoreSolo(soloin: SoloinComponent, state: SoloinSessionState | null): void {
    if (state) {
      soloin.applySessionState(state);
      this.seededTabs.add('solo');
    } else {
      soloin.resetSessionState();
    }
  }

  private applySoloFromSession(solo: SavedSessionSolo | undefined): void {
    const state: SoloinSessionState | null = solo
      ? ({ marks: solo.m, tuning: solo.t, key: solo.k, scale: solo.s } as SoloinSessionState)
      : null;
    const soloin = this.soloin();
    if (soloin) this.restoreSolo(soloin, state);
    else this.pendingSolo = { state };
  }

  private applySession(session: SavedSessionData): void {
    this.tempo.bpm.set(session.bpm);
    this.tempo.beatsPerMeasure.set(session.beats);
    this.tempo.realignToMeasureStart();
    this.backingTrackInitialState.set({ sectionOrder: session.sectionOrder, sections: session.sections });

    const chordFinder = this.chordFinder();
    if (chordFinder) {
      chordFinder.query.set(session.prog);
      chordFinder.runSearch();
    } else {
      this.pendingProg = session.prog;
    }

    this.applySoloFromSession(session.solo);
  }

  toggleSaveNamePopover(): void {
    this.saveNameOpen.update((open) => !open);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const wrap = this.saveSessionWrap()?.nativeElement;
    if (this.saveNameOpen() && wrap && !wrap.contains(event.target as Node)) {
      this.saveNameOpen.set(false);
    }
  }

  confirmSaveSession(): void {
    const name = this.saveNameValue().trim() || this.defaultSessionName();
    const data = this.captureCurrentSession();
    this.sessionsService.save(name, data);
    this.saveNameOpen.set(false);
    this.saveNameValue.set('');

    const encoded = encodeSession(data);
    this.skipNextApply = true; // already applied — skip the query-param effect's re-apply
    this.router.navigate([], { relativeTo: this.route, queryParams: { s: encoded }, replaceUrl: true });
  }

  private captureCurrentSession(): SavedSessionData {
    const backing = this.backingTrack()?.exportState() ?? {};
    const soloState = this.soloin()?.getSessionState();
    const solo: SavedSessionSolo | undefined = soloState
      ? { m: soloState.marks, t: soloState.tuning, k: soloState.key, s: soloState.scale }
      : undefined;
    return {
      v: 1,
      bpm: this.tempo.bpm(),
      beats: this.tempo.beatsPerMeasure(),
      prog: this.chordFinder()?.query() ?? '',
      ...backing,
      ...(solo ? { solo } : {}),
    };
  }

  private defaultSessionName(): string {
    const locale = this.preferences.language() === 'es' ? 'es-ES' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(Date.now());
  }

  setTab(tab: ComposeTab): void {
    this.activeTab.set(tab);
    this.seedFromRhythm(tab);
  }

  private seedFromRhythm(tab: ComposeTab): void {
    if (tab === 'rhythm' || this.seededTabs.has(tab)) return;
    const progression = this.chordFinder()?.query()?.trim();
    if (!progression) return;
    this.seededTabs.add(tab);

    if (tab === 'theory') {
      const circle = this.circle();
      if (!circle) return;
      const key = detectKey(progression.split(',').map((c) => c.trim()).filter(Boolean));
      if (!key) return;
      const index =
        key.mode === 'major' ? MAJOR_PC_TO_CIRCLE_INDEX[key.root] : MINOR_PC_TO_CIRCLE_INDEX[key.root];
      if (index === undefined) return;
      circle.selectKey(index, key.mode);
    } else if (tab === 'solo') {
      const soloin = this.soloin();
      if (!soloin) return;
      soloin.mode.set('progression');
      soloin.progressionInput.set(progression);
    } else if (tab === 'bass') {
      const bass = this.bass();
      if (!bass) return;
      bass.input.set(progression.replace(/,\s*/g, ' '));
    }
  }
}
