# TODO

## Unify chord parsing across the `@gblp/*` family

Three separate chord-parsing implementations exist today, each with its own vocabulary and no shared error UX:

- **Chord Finder** (`chord-generator` repo, `chord.service.ts`) — chords-db-backed, supports `add9`, `Δ` (maj7 triangle), unicode ♯/♭, case-insensitive, real per-section validation errors.
- **`@gblp/music-theory`'s `parseChordName`** (`music-theory` repo, used by Soloin, the-chords' backing-track, and its own key-detection) — a fixed quality table (17 as of 2026-08-26: 11 original + maj9/m9/m11/dom9/dom13/maj7#11 added this session), unicode ♯/♭ normalized, case-insensitive, no `add9`/`Δ`.
- **Bass Notes' `parseBassNote`** (`bass-guitar` repo) — bare root-letter regex, no quality/suffix parsing at all.

Concrete symptom: typing `"CΔ"` or `"Cadd9"` renders correctly in Chord Finder but silently produces nothing in the-chords' backing track, because music-theory's parser doesn't recognize those tokens. This will keep happening for any future vocabulary gap between the two parsers.

**Options to consider** (not decided yet):
1. Make `@gblp/music-theory` the single parser every tool delegates to, and extend its vocabulary to cover Chord Finder's chords-db-backed cases (`add9`, `Δ`, whatever else chords-db recognizes that music-theory doesn't).
2. Keep chords-db in Chord Finder for fretboard-position lookup (music-theory has no concept of positions), but have it also export/reuse music-theory's `parseChordName` for the "is this a valid chord" question, so at least the two agree on vocabulary.
3. At minimum, standardize the *error UX* even if the vocabularies stay different — Soloin's `unparsedChords` + `suggestChordName` pattern (now also used by Bass Notes and the-chords' backing-track as of this session) is the reference to copy anywhere still silently dropping bad tokens.

## Version discipline across `@gblp/*` packages

See conversation notes / commit messages from 2026-08-26: a fix to `@gblp/music-theory` doesn't automatically reach every consumer — each dependent package (`@gblp/soloin` pins `^0.1.0`, others may pin similarly) needs its own dependency bump + republish. Worth a one-time audit of what every `@gblp/*` package currently pins for its `@gblp/*` peers, and worth deciding on a lighter-weight propagation process (see discussion) before the next shared-package fix quietly misses half the family again.
