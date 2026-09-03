import { driver } from 'driver.js';

export type TourKey = 'chord-finder' | 'circle-of-fifths' | 'bass-notes' | 'soloin';

interface TourStepCopy {
  element: string;
  title: string;
  description: string;
}

interface TourCopy {
  next: string;
  prev: string;
  done: string;
  progress: string;
  steps: TourStepCopy[];
}

const TOURS: Record<'es' | 'en', Record<TourKey, TourCopy>> = {
  es: {
    'chord-finder': {
      next: 'Siguiente',
      prev: 'Anterior',
      done: 'Listo',
      progress: '{{current}} de {{total}}',
      steps: [
        {
          element: '#chordInput',
          title: 'Escribe tus acordes',
          description: 'Hasta 5 acordes separados por coma. Soporta sostenidos y bemoles: C, F#, C#m, Bb.',
        },
        {
          element: '.results-row',
          title: 'Diagramas de acordes',
          description: 'Cada tarjeta muestra dónde poner los dedos en el diapasón para ese acorde.',
        },
        {
          element: '.export-wrap',
          title: 'Exporta como imagen',
          description: 'Descarga los diagramas como PNG, con el color de fondo y línea que prefieras.',
        },
        {
          element: '.hint',
          title: 'Tipos de acorde soportados',
          description: 'Mayor, menor, séptimas, sus, add9 y más: esta lista recuerda qué puedes escribir.',
        },
      ],
    },
    'circle-of-fifths': {
      next: 'Siguiente',
      prev: 'Anterior',
      done: 'Listo',
      progress: '{{current}} de {{total}}',
      steps: [
        {
          element: '.circle-and-chords-wheel',
          title: 'El círculo de quintas',
          description: 'Haz clic en cualquier tonalidad mayor o menor para resaltar sus acordes diatónicos.',
        },
        {
          element: '.circle-and-chords-section',
          title: 'Acordes diatónicos',
          description: 'Los 7 acordes que se construyen naturalmente sobre la tonalidad elegida, del I al vii°.',
        },
        {
          element: '.progressions-section',
          title: 'Progresiones comunes',
          description:
            'Progresiones típicas en esa tonalidad, listas para usar: transpón, expande cada sección o genera otras nuevas.',
        },
      ],
    },
    'bass-notes': {
      next: 'Siguiente',
      prev: 'Anterior',
      done: 'Listo',
      progress: '{{current}} de {{total}}',
      steps: [
        {
          element: '#prog-input',
          title: 'Tu progresión de acordes',
          description: 'Escribe los acordes de tu canción; el bajo se construye a partir de estas fundamentales.',
        },
        {
          element: '.legend',
          title: 'Acordes de la progresión',
          description: 'Cada acorde tiene su color: haz clic para aislar sus notas en el diapasón.',
        },
        {
          element: '.fretboard-wrap',
          title: 'Diapasón de bajo',
          description: 'Ve exactamente qué notas tocar, y en qué traste, para cada acorde de tu progresión.',
        },
        {
          element: '.playback-bar',
          title: 'Reproduce la progresión',
          description: 'Avanza acorde por acorde para practicar tu línea de bajo a tu ritmo.',
        },
      ],
    },
    soloin: {
      next: 'Siguiente',
      prev: 'Anterior',
      done: 'Listo',
      progress: '{{current}} de {{total}}',
      steps: [
        {
          element: '.mode-toggle',
          title: 'Progresión o tonalidad',
          description: 'Elige si quieres partir de una progresión de acordes o directamente de una tonalidad.',
        },
        {
          element: '#soloin-progression',
          title: 'Tu progresión',
          description: 'Escribe tus acordes; Soloin detecta automáticamente la tonalidad que mejor encaja.',
        },
        {
          element: '.key-readout',
          title: 'Tonalidad detectada',
          description:
            'Aquí ves la tonalidad elegida para tu solo, con alternativas si tu progresión encaja en más de una.',
        },
        {
          element: '#soloin-scale',
          title: 'Escala o modo',
          description:
            'Cambia la escala para explorar distintos colores sobre la misma progresión: modos, pentatónicas, blues...',
        },
        {
          element: '.actions',
          title: 'Exporta tu solo',
          description: 'Descarga el diagrama como imagen o cópialo como texto para guardarlo o compartirlo.',
        },
      ],
    },
  },
  en: {
    'chord-finder': {
      next: 'Next',
      prev: 'Previous',
      done: 'Done',
      progress: '{{current}} of {{total}}',
      steps: [
        {
          element: '#chordInput',
          title: 'Type your chords',
          description: 'Up to 5 chords separated by commas. Sharps and flats are supported: C, F#, C#m, Bb.',
        },
        {
          element: '.results-row',
          title: 'Chord diagrams',
          description: 'Each card shows where to place your fingers on the fretboard for that chord.',
        },
        {
          element: '.export-wrap',
          title: 'Export as an image',
          description: 'Download the diagrams as a PNG, with whatever background and line color you like.',
        },
        {
          element: '.hint',
          title: 'Supported chord types',
          description: 'Major, minor, sevenths, sus, add9 and more: this list is a reminder of what you can type.',
        },
      ],
    },
    'circle-of-fifths': {
      next: 'Next',
      prev: 'Previous',
      done: 'Done',
      progress: '{{current}} of {{total}}',
      steps: [
        {
          element: '.circle-and-chords-wheel',
          title: 'The circle of fifths',
          description: 'Click any major or minor key to highlight its diatonic chords.',
        },
        {
          element: '.circle-and-chords-section',
          title: 'Diatonic chords',
          description: 'The 7 chords built naturally on the key you picked, from I to vii°.',
        },
        {
          element: '.progressions-section',
          title: 'Common progressions',
          description: 'Typical progressions in that key, ready to use: transpose, expand each section, or generate new ones.',
        },
      ],
    },
    'bass-notes': {
      next: 'Next',
      prev: 'Previous',
      done: 'Done',
      progress: '{{current}} of {{total}}',
      steps: [
        {
          element: '#prog-input',
          title: 'Your chord progression',
          description: "Type your song's chords; the bassline is built from these roots.",
        },
        {
          element: '.legend',
          title: 'Chords in the progression',
          description: "Each chord gets its own color: click one to isolate its notes on the fretboard.",
        },
        {
          element: '.fretboard-wrap',
          title: 'Bass fretboard',
          description: 'See exactly which notes to play, and where, for each chord in your progression.',
        },
        {
          element: '.playback-bar',
          title: 'Play through the progression',
          description: 'Step chord by chord to practice your bassline at your own pace.',
        },
      ],
    },
    soloin: {
      next: 'Next',
      prev: 'Previous',
      done: 'Done',
      progress: '{{current}} of {{total}}',
      steps: [
        {
          element: '.mode-toggle',
          title: 'Progression or key',
          description: 'Choose whether to start from a chord progression or directly from a key.',
        },
        {
          element: '#soloin-progression',
          title: 'Your progression',
          description: 'Type your chords; Soloin automatically detects the key that fits best.',
        },
        {
          element: '.key-readout',
          title: 'Detected key',
          description: 'This shows the key chosen for your solo, with alternatives if your progression fits more than one.',
        },
        {
          element: '#soloin-scale',
          title: 'Scale or mode',
          description: 'Change the scale to explore different flavors over the same progression: modes, pentatonics, blues...',
        },
        {
          element: '.actions',
          title: 'Export your solo',
          description: 'Download the diagram as an image, or copy it as text to save or share.',
        },
      ],
    },
  },
};

export function startTour(key: TourKey, language: 'es' | 'en'): void {
  const copy = TOURS[language][key];
  driver({
    showProgress: true,
    progressText: copy.progress,
    nextBtnText: copy.next,
    prevBtnText: copy.prev,
    doneBtnText: copy.done,
    steps: copy.steps.map((step) => ({
      element: step.element,
      popover: { title: step.title, description: step.description },
    })),
  }).drive();
}
