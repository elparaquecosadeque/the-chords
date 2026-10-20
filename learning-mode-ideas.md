# Learning mode — raw idea, not decided yet

Apartado de aprendizaje para principiantes/músicos que quieran repasar
conceptos, usando los módulos existentes de The Chords (Chord Finder, Circle
of Fifths, Bass Notes, Soloin, Compose) como referencia visual y teórica.
Todavía crudo — falta afinar alcance, UX y, sobre todo, validar el contenido
teórico contra fuentes confiables antes de escribir una sola lección (ver
"Fuentes a validar" abajo).

## Currículum propuesto (orden)

1. Acordes básicos (escala de Do)
2. Primera canción
3. Empezar a analizar las notas
4. Notas en una escala — **falta agregar "intervalos" como paso explícito
   antes de este**, es la base conceptual de por qué una escala se forma así
5. Cómo se forma un acorde
6. Acordes mayores y menores
7. Tocar más canciones
8. Círculo de quintas
9. Canción con quintas
10. Grados y tensión
11. Transposición de grados y tensiones a otros círculos
12. Más canciones
13. Improvisación con técnicas de punteo
14. Repaso: círculo de quintas, acordes
15. Calidades de acordes
16. Intercambio modal (ya construido como feature real en Compose — esta
    lección sería la puerta de entrada pedagógica hacia esa herramienta)

**Idea de visual para intervalos/escalas:** mostrar todas las notas
cromáticas en una sola cuerda (como un fretboard horizontal), reutilizando
los componentes de diagrama de cuerdas que ya existen.

## Ideas de arquitectura/UX (sin decidir)

### A. Módulo de lecciones aparte
- Lecciones con hipervínculos "Inténtalo tú mismo" que llevan a la
  herramienta real (Chord Finder, Circle of Fifths, etc.) después de cada
  lección, para que el usuario explore lo recién explicado.
- Tracking de qué lecciones ya se revisaron (persistido, similar a
  `PreferencesService` / localStorage que ya usa el resto de la app).

### B. Tooltip teórico contextual en las cards de resultado
- Ícono "?" o emoji 🤔 en la esquina superior derecha de cada card de
  **Chord Finder** (`@gblp/chord-finder`'s `ChordDiagram`/result card).
- Abre un modal explicando cómo se forma ese acorde específico (ej. por qué
  un Em6 tiene las notas que tiene), con intervalos y teoría.
- **Nota de arquitectura:** esto vive en el componente de la librería
  `chord-finder`, no solo en `the-chords` — pensar si el contenido
  explicativo debe vivir ahí (acoplando teoría a la librería) o inyectarse
  desde afuera (ej. vía content projection, como ya se hizo con el
  `[chord-finder-extra]` slot para el Live Circle de Compose).

## Fuentes a validar antes de escribir contenido

El usuario es autodidacta y quiere evitar explicaciones incorrectas o
mal explicadas. Cruzar cada lección contra fuentes abiertas y reconocidas,
por ejemplo:
- musictheory.net
- *Open Music Theory* (libro de texto abierto)
- Material de teoría introductoria de Berklee

No usar como única fuente la intuición/memoria propia ni la del asistente —
ambos son autodidactas en esto.

## Estado

Sin empezar a implementar. Este documento es solo para no perder el hilo
entre conversaciones mientras se afina el alcance.
