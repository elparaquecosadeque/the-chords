import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'chord-finder',
  },
  {
    path: 'chord-finder',
    title: 'Chord Finder | The Chords',
    loadComponent: () =>
      import('./chord-finder-page').then(({ ChordFinderPage }) => ChordFinderPage),
  },
  {
    path: 'circle-of-fifths',
    title: 'Circle of Fifths | The Chords',
    loadComponent: () =>
      import('./circle-of-fifths-page').then(({ CircleOfFifthsPage }) => CircleOfFifthsPage),
  },
  {
    path: 'bass-notes',
    title: 'Bass Notes | The Chords',
    loadComponent: () =>
      import('./bass-notes-page').then(({ BassNotesPageWrapper }) => BassNotesPageWrapper),
  },
  {
    path: 'soloin',
    title: 'Soloin | The Chords',
    loadComponent: () => import('./soloin-page').then(({ SoloinPage }) => SoloinPage),
  },
  {
    path: '**',
    redirectTo: 'chord-finder',
  },
];
