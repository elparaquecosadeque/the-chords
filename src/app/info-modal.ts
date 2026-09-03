import { Component, computed, effect, ElementRef, HostListener, inject, input, output, viewChild } from '@angular/core';

import type { ComposeTab } from './compose-page';
import { LocalizationService } from './localization.service';
import { PreferencesService } from './preferences.service';
import { startTour, type TourKey } from './tour';

interface InfoSection {
  title: string;
  body: string;
  tourKey?: TourKey;
}

const TOUR_KEYS = new Set<string>(['chord-finder', 'circle-of-fifths', 'bass-notes', 'soloin']);

const COMPOSE_TAB_TO_ROUTE_KEY: Record<ComposeTab, string> = {
  rhythm: 'chord-finder',
  theory: 'circle-of-fifths',
  solo: 'soloin',
  bass: 'bass-notes',
};

@Component({
  selector: 'app-info-modal',
  imports: [],
  templateUrl: './info-modal.html',
  styleUrl: './info-modal.scss',
})
export class InfoModal {
  private readonly localization = inject(LocalizationService);
  private readonly preferences = inject(PreferencesService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  readonly text = this.localization.languageDictionary;

  readonly open = input(false);
  readonly routeKey = input<string>('');
  readonly composeTab = input<ComposeTab | null>(null);
  readonly closed = output<void>();

  readonly sections = computed<InfoSection[]>(() => {
    const nav = this.text();
    const info = nav.infoModal;
    const routeKey = this.routeKey();

    if (routeKey === 'compose') {
      const toolKey = COMPOSE_TAB_TO_ROUTE_KEY[this.composeTab() ?? 'rhythm'];
      return [
        { title: nav.compose, body: info.compose },
        this.sectionFor(toolKey),
        { title: nav.backingTrack.title, body: info.backingTrack },
      ].filter((section): section is InfoSection => section !== null);
    }

    const section = this.sectionFor(routeKey);
    if (!section) return [];
    return TOUR_KEYS.has(routeKey) ? [{ ...section, tourKey: routeKey as TourKey }] : [section];
  });

  constructor() {
    effect(() => {
      if (this.open()) this.closeButton()?.nativeElement.focus();
    });
  }

  private sectionFor(routeKey: string): InfoSection | null {
    const nav = this.text();
    const info = nav.infoModal;
    switch (routeKey) {
      case 'chord-finder':
        return { title: nav.chordFinder, body: info.chordFinder };
      case 'circle-of-fifths':
        return { title: nav.circleOfFifths, body: info.circleOfFifths };
      case 'bass-notes':
        return { title: nav.bassNotes, body: info.bassNotes };
      case 'soloin':
        return { title: nav.soloin, body: info.soloin };
      default:
        return null;
    }
  }

  close(): void {
    this.closed.emit();
  }

  startWalkthrough(tourKey: TourKey): void {
    const language = this.preferences.language();
    this.close();
    // Wait a tick so the backdrop (which blurs the real page) is torn down
    // before driver.js spotlights an element underneath it.
    setTimeout(() => startTour(tourKey, language));
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.close();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }
}
