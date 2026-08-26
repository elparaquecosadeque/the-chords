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
                    circlePreviewToggle: 'Círculo en vivo',
                    enharmonicNote: 'Las tonalidades se muestran con su deletreo estándar (p. ej. Db), que puede no coincidir con los sostenidos/bemoles que escribiste.',
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
                    timeSignatureLabel: 'Compás',
                    volumeLabel: 'Volumen',
                },
                backingTrack: {
                    title: 'Pista de acompañamiento',
                    enable: 'Activar pista de acompañamiento (piano)',
                    disable: 'Silenciar pista de acompañamiento',
                    loading: 'Cargando piano…',
                    empty: 'Escribe una progresión en Ritmo para escucharla.',
                    sync: 'Sincronizado con la progresión',
                    beats: 'pulsos',
                    moveChord: 'Mover acorde',
                    resizeChord: 'Cambiar duración',
                    instrumentLabel: 'Instrumento',
                    instruments: { piano: 'Piano', guitar: 'Guitarra', synth: 'Synth' },
                    articulation: {
                        label: 'Modo de acorde',
                        restrike: 'Repetir en cada pulso',
                        sustain: 'Sostenido',
                    },
                    strum: {
                        label: 'Rasgueo',
                        none: 'Sin strum',
                        down: 'Abajo',
                        alternating: 'Abajo-Arriba',
                    },
                    repeatCount: 'Repeticiones',
                    repeatInfinite: 'Repetir indefinidamente',
                    moveSection: 'Mover sección',
                    jumpToSection: 'Saltar a esta sección',
                    unrecognizedChord: (raw: string, suggestion: string | null) =>
                        suggestion ? `"${raw}" no reconocido — ¿quisiste decir "${suggestion}"?` : `"${raw}" no reconocido`,
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
                    circlePreviewToggle: 'Live circle',
                    enharmonicNote: 'Keys are shown in their standard spelling (e.g. Db), which may not match the sharps/flats you typed.',
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
                    timeSignatureLabel: 'Time signature',
                    volumeLabel: 'Volume',
                },
                backingTrack: {
                    title: 'Backing track',
                    enable: 'Enable backing track (piano)',
                    disable: 'Mute backing track',
                    loading: 'Loading piano…',
                    empty: 'Type a progression in Rhythm to hear it.',
                    sync: 'Synced with progression',
                    beats: 'beats',
                    moveChord: 'Move chord',
                    resizeChord: 'Resize length',
                    instrumentLabel: 'Instrument',
                    instruments: { piano: 'Piano', guitar: 'Guitar', synth: 'Synth' },
                    articulation: {
                        label: 'Chord mode',
                        restrike: 'Re-strike every beat',
                        sustain: 'Sustain',
                    },
                    strum: {
                        label: 'Strum',
                        none: 'No strum',
                        down: 'Down',
                        alternating: 'Down-Up',
                    },
                    repeatCount: 'Repeat count',
                    repeatInfinite: 'Repeat forever',
                    moveSection: 'Move section',
                    jumpToSection: 'Jump to this section',
                    unrecognizedChord: (raw: string, suggestion: string | null) =>
                        suggestion ? `"${raw}" not recognized — did you mean "${suggestion}"?` : `"${raw}" not recognized`,
                },
                repository: 'The Chords repository',
                socialLinks: 'Social profiles',
                githubProfile: 'Bruno Leon on GitHub',
                linkedinProfile: 'Bruno Leon on LinkedIn',
                attribution: 'made with HitL methodology with supervision of',
            },
    );
}
