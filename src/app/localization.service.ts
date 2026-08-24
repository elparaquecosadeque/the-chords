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
                soloin: 'Soloin',
                compose: 'Componer',
                composePage: {
                    title: 'Componer',
                    intro:
                        'Recorre las 4 herramientas en el orden en que normalmente compondrías una canción: ritmo, teoría, solo y bajo. Lo que escribas en cada una se conserva mientras navegas entre pestañas.',
                    tabs: { rhythm: 'Ritmo', theory: 'Teoría', solo: 'Solo', bass: 'Bajo' },
                    descriptions: {
                        rhythm: 'Empieza por tu progresión de acordes rítmica en el Buscador de acordes.',
                        theory: 'Explora la tonalidad y la armonía de tu progresión en el Círculo de quintas.',
                        solo: 'Encuentra las escalas para tu solo sobre esa progresión en Soloin.',
                        bass: 'Construye tu línea de bajo a partir de los mismos acordes en Notas de bajo.',
                    },
                    circlePreviewToggle: 'Mostrar círculo de quintas en vivo',
                },
                homeLabel: 'Inicio de The Chords',
                darkTheme: 'Tema oscuro',
                lightTheme: 'Tema claro',
                language: 'Cambiar idioma',
                metronome: {
                    play: 'Reproducir metrónomo',
                    pause: 'Pausar metrónomo',
                    bpmLabel: 'Pulsaciones por minuto',
                    bpmUnit: 'BPM',
                },
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
                soloin: 'Soloin',
                compose: 'Compose',
                composePage: {
                    title: 'Compose',
                    intro:
                        'Walk through all 4 tools in the order you’d normally write a song: rhythm, theory, solo, and bass. Whatever you type in each one stays there as you switch tabs.',
                    tabs: { rhythm: 'Rhythm', theory: 'Theory', solo: 'Solo', bass: 'Bass' },
                    descriptions: {
                        rhythm: 'Start with your rhythm chord progression in Chord Finder.',
                        theory: 'Explore the key and harmony behind that progression in Circle of Fifths.',
                        solo: 'Find the scales for your solo over that progression in Soloin.',
                        bass: 'Build a bassline from the same chords in Bass Notes.',
                    },
                    circlePreviewToggle: 'Show live circle of fifths',
                },
                homeLabel: 'The Chords home',
                darkTheme: 'Dark theme',
                lightTheme: 'Light theme',
                language: 'Change language',
                metronome: {
                    play: 'Play metronome',
                    pause: 'Pause metronome',
                    bpmLabel: 'Beats per minute',
                    bpmUnit: 'BPM',
                },
                repository: 'The Chords repository',
                socialLinks: 'Social profiles',
                githubProfile: 'Bruno Leon on GitHub',
                linkedinProfile: 'Bruno Leon on LinkedIn',
                attribution: 'made with HitL methodology with supervision of',
            },
    );
}
