import { effect, Injectable, signal } from '@angular/core';

import type { SavedSessionData } from './session-codec';

export interface SavedSession {
  id: string;
  name: string;
  savedAt: number;
  data: SavedSessionData;
}

const STORAGE_KEY = 'the-chords-sessions';
const MAX_SESSIONS = 20;

function loadSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Newest-first list, capped at MAX_SESSIONS — following PreferencesService's
// localStorage-per-key pattern, but for a list instead of a single value.
@Injectable({ providedIn: 'root' })
export class SessionsService {
  readonly sessions = signal<SavedSession[]>(loadSessions());

  constructor() {
    effect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessions())));
  }

  save(name: string, data: SavedSessionData): void {
    const entry: SavedSession = { id: crypto.randomUUID(), name, savedAt: Date.now(), data };
    this.sessions.update((list) => [entry, ...list].slice(0, MAX_SESSIONS));
  }

  remove(id: string): void {
    this.sessions.update((list) => list.filter((session) => session.id !== id));
  }
}
