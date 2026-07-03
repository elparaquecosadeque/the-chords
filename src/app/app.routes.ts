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
    path: '**',
    redirectTo: 'chord-finder',
  },
];
