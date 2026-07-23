import { computed, Injectable, inject } from '@angular/core';

import { PreferencesService } from './preferences.service';

@Injectable({ providedIn: 'root' })
export class LocalizationService {
    private readonly preferences = inject(PreferencesService);

    readonly languageDictionary = computed(() =>
        this.preferences.language() === 'es'
            ? {
                navLabel: 'Herramientas de acordes',
                chordFinder: 'Buscador de acordes',
                circleOfFifths: 'Círculo de quintas',
                bassNotes: 'Notas de bajo',
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
                bassNotes: 'Bass Notes',
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
}
