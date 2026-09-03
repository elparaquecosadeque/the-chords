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
                infoModal: {
                    buttonLabel: 'Qué es esto',
                    close: 'Cerrar',
                    startTour: 'Ver recorrido guiado',
                    chordFinder:
                        'Un acorde es un grupo de notas que suenan juntas. Aquí buscas el nombre de un acorde (por ejemplo Cmaj7 o G7) y ves sus digitaciones posibles en el diapasón: qué trastes y cuerdas tocar. Las tríadas (3 notas: fundamental, tercera y quinta) son la base; acordes extendidos como el 7, 9 u 11 añaden color agregando notas por encima de esa tríada.',
                    circleOfFifths:
                        'El círculo de quintas ordena las 12 tonalidades según su cercanía armónica: cada paso hacia la derecha sube una quinta justa y suma un sostenido a la armadura de clave. Al elegir una tonalidad ves sus 7 acordes diatónicos (I, ii, iii, IV, V, vi, vii°), los que se construyen naturalmente sobre cada grado de la escala y que suelen combinarse bien entre sí.',
                    bassNotes:
                        'La línea de bajo normalmente parte de la fundamental de cada acorde de tu progresión, marcando el pulso armónico. Desde ahí puedes acercarte a la siguiente fundamental con notas de paso o del propio acorde, dando movimiento sin perder el centro tonal de cada compás.',
                    soloin:
                        'Para improvisar un solo sobre una progresión, primero identificas su tonalidad y luego eliges una escala o modo que combine con esos acordes: la escala mayor o menor de la tonalidad, un modo relacionado, o una pentatónica si buscas algo más simple y directo.',
                    backingTrack:
                        'Una pista de acompañamiento reproduce los acordes de tu progresión como si los tocara un instrumento de fondo (comping), dándote un contexto armónico real para ensayar tu solo o tu línea de bajo encima.',
                    compose:
                        'Componer une las otras 4 herramientas en una sola página, en el orden en que normalmente armarías una canción: escribes tu progresión rítmica, exploras su teoría y tonalidad, encuentras un solo y construyes el bajo, todo sobre la misma progresión, sin ir y venir entre pestañas.',
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
                infoModal: {
                    buttonLabel: "What's this",
                    close: 'Close',
                    startTour: 'Start walkthrough',
                    chordFinder:
                        'A chord is a group of notes played together. Here you search for a chord name (like Cmaj7 or G7) and see its possible fretboard fingerings — which frets and strings to play. Triads (3 notes: root, third and fifth) are the foundation; extended chords like 7ths, 9ths or 11ths add color by stacking more notes on top of that triad.',
                    circleOfFifths:
                        'The circle of fifths arranges all 12 keys by harmonic closeness: each step clockwise rises a perfect fifth and adds one sharp to the key signature. Picking a key shows its 7 diatonic chords (I, ii, iii, IV, V, vi, vii°) — the chords built naturally on each scale degree, which tend to sound good together.',
                    bassNotes:
                        "A bassline usually starts from each chord's root in your progression, laying down the harmonic pulse. From there you can approach the next root with passing or chord tones, adding movement while keeping each bar anchored to its key.",
                    soloin:
                        "To solo over a progression, you first work out its key, then pick a scale or mode that fits those chords: the key's major or minor scale, a related mode, or a pentatonic if you want something simpler and more direct.",
                    backingTrack:
                        "A backing track plays your progression's chords like a background instrument would (comping), giving you a real harmonic bed to practice a solo or bassline against.",
                    compose:
                        "Compose brings the other 4 tools together on one page, in the order you'd normally build a song: write your rhythm progression, explore its theory and key, find a solo, and build a bassline, all on the same progression, without flipping between tabs.",
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
