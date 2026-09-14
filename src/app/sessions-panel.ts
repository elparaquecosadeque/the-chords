import { Component, effect, ElementRef, HostListener, inject, input, output, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { LocalizationService } from './localization.service';
import { PreferencesService } from './preferences.service';
import { encodeSession } from './session-codec';
import { SessionsService, type SavedSession } from './sessions.service';

@Component({
  selector: 'app-sessions-panel',
  imports: [],
  templateUrl: './sessions-panel.html',
  styleUrl: './sessions-panel.scss',
})
export class SessionsPanel {
  private readonly localization = inject(LocalizationService);
  private readonly preferences = inject(PreferencesService);
  private readonly sessionsService = inject(SessionsService);
  private readonly router = inject(Router);
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  readonly text = this.localization.languageDictionary;
  readonly sessions = this.sessionsService.sessions;

  readonly open = input(false);
  readonly closed = output<void>();

  constructor() {
    effect(() => {
      if (this.open()) this.closeButton()?.nativeElement.focus();
    });
  }

  close(): void {
    this.closed.emit();
  }

  load(session: SavedSession): void {
    this.close();
    this.router.navigate(['/compose'], { queryParams: { s: encodeSession(session.data) } });
  }

  remove(id: string, event: Event): void {
    event.stopPropagation();
    this.sessionsService.remove(id);
  }

  formatDate(timestamp: number): string {
    const locale = this.preferences.language() === 'es' ? 'es-ES' : 'en-US';
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.close();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }
}
