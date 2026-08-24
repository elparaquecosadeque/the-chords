---
target: /compose page (live circle preview, diagram grid, metronome)
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
timestamp: 2026-08-24T16-50-30Z
slug: src-app-compose-page-ts
---
Method: dual-agent (A: general-purpose design review · B: general-purpose detector/browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Metronome play/pause only swaps an icon + fill color — no waveform, no beat pulse, no BPM-synced motion. Circle-of-fifths live update is excellent by contrast. |
| 2 | Match System / Real World | 4 | Roman numerals, correct Spanish/English music terms, enharmonic input all read as authored by someone who knows theory. |
| 3 | User Control and Freedom | 3 | Chord input is fully re-editable with no undo needed; diatonic-chord row has no working click-drag scroll, only a thin native scrollbar. |
| 4 | Consistency and Standards | 2 | "Always show diagrams" checkbox does double duty (persist + immediately hide/show), inconsistent with what a plain checkbox implies. |
| 5 | Error Prevention | 1 | BPM input has a real bug: clearing the field and typing digit-by-digit gets clamped/overwritten mid-entry (empty string reads as 0). |
| 6 | Recognition Rather Than Recall | 3 | Chord Finder shows accepted syntax inline; wheel labels every key. Neither new toggle signals that it's remembered. |
| 7 | Flexibility and Efficiency of Use | 1 | No tap-tempo, no BPM keyboard shortcuts, and direct BPM typing is actively broken. Progression-sharing across tabs is the one efficiency win. |
| 8 | Aesthetic and Minimalist Design | 3 | Cohesive neon theme; the Rhythm-tab wheel preview duplicates the Theory-tab wheel one click away — redundant more than minimal. |
| 9 | Error Recovery | 4 | Invalid chord names produce a specific, actionable message ("Nombre inválido. Prueba C, F#, C#m, Bb, Am7 o Dsus4."). Verified live. |
| 10 | Help and Documentation | 1 | No inline explanation of what "live" preview does, no BPM range shown, no indication either toggle persists across reloads. |
| **Total** | | **24/40** | **Acceptable — solid new features undercut by one real bug (BPM) and a few rough edges** |

## Design Specificity Verdict

**LLM assessment**: Not generic. The dark neon aesthetic (cyan/magenta/yellow accents, glow shadows, pill tabs with numbered badges), the circle-of-fifths color language (yellow=tonic, teal=IV/V, magenta=ii/iii/vi, red=vii°) reused consistently between the new live-preview wheel and the existing Theory wheel, real guitar fretboard diagrams, and correct roman-numeral/Spanish music terminology all read as built by someone who plays guitar and knows theory — not a template. The one place that slips toward generic is the new navbar metronome: a plain round icon button + number input styled identically to the theme/language toggles, with none of the rest of the app's visual personality.

**Deterministic scan**: The CLI regex scan (degraded mode — HTML parser modules unavailable, so contrast/custom-property/selector checks did not run) returned zero findings on the three actually-changed files (`compose-page.html`, `metronome.html`, `app.html`). The browser-injected scan against the full rendered `/compose` page found 20 anti-pattern instances, but **none of them are in the new code from this session** — they're pre-existing patterns in `chord-finder`'s hero card and `circle-of-fifths`' wheel/diagram SVGs, which happen to render inside the Rhythm/Theory tabs. Breaking those 20 down:
- **10× `low-contrast`** ("#f8f8ff on #ffffff", ~1.1:1) on SVG `<text>` elements inside the wheel/fretboard diagrams. This almost certainly a **false positive**: my own screenshots during verification show these diagrams rendering with clearly legible black text on white cards, and dark theme text on a dark background elsewhere — the detector likely resolved a `var(--chords-text)` custom property against the wrong scope for isolated SVG text nodes rather than what's actually painted. Worth one manual spot-check with a real contrast tool, but not something to fix blind.
- **6× `ai-color-palette`** ("cyan neon on dark") — this is the deliberate, well-executed brand identity Assessment A independently praised. Treat as a false positive by design, not a defect.
- **2× `gpt-thin-border-wide-shadow`**, **1× `hero-eyebrow-chip`**, **1× `overused-font`** (Inter, 100%), **1× `dark-glow`** — generic-AI-template pattern flags on pre-existing `chord-finder` styling (hero card, eyebrow tag). Thematically justified by the deliberate neon-glow identity, but worth keeping in mind for a future typography/pattern pass — not urgent, and out of scope for this session's changes.

**Visual overlays**: Not available in this chat — the injection ran in Assessment B's own isolated browser tab, which has since been closed. The console findings above are the full record.

## Overall Impression

The three new features are functionally solid and fit the product's visual language well — the live circle-of-fifths preview in particular is fast, musically correct, and genuinely satisfying to use. But there's one real bug (BPM typing) and a couple of rough interaction edges (diatonic row clipping, a checkbox that does more than it says) that keep this from feeling finished. The metronome is the weakest of the three additions — it works, but visually it's an afterthought bolted onto the navbar rather than something built with the same care as the rest of the app.

## What's Working

1. **Invalid-chord error handling** — typing garbage ("Xyz, Q#, Foo") produces per-chord red cards with a specific, actionable message instead of a silent failure or generic toast.
2. **Live key detection** — typing `F#, C#, D#m` updates the wheel instantly with the correct key highlighted, no lag, no flash. This is the standout new interaction.
3. **Diagram persistence** — "Siempre mostrar diagramas" survives a full page reload with no bugs in the storage mechanism itself.

## Priority Issues

**[P0] BPM input fights the user when typed directly**
- **Why it matters**: `Number('')` evaluates to `0`, not `NaN`, so clearing the field and typing a new tempo digit-by-digit gets clamped mid-entry (repro: clear → type "9" → type "0" lands on "240", never "90"). Any musician typing a specific tempo by hand hits this immediately.
- **Fix**: Treat the empty string as "no value yet" instead of `0`, and clamp on blur (or debounce) instead of on every keystroke, so the DOM value stops fighting the user's cursor.
- **Suggested command**: `/impeccable harden`

**[P1] Diatonic chord row is clipped at normal desktop width**
- **Why it matters**: At the Theory tab's side-by-side wheel+chords layout (triggers ≥900px, so this reproduces at any typical desktop width, not just narrow viewports), the 7-card diatonic row only shows ~5 cards — the **I** (tonic, arguably the most important card) and **vii°** are scrolled off both edges, and click-drag across the row just selects text instead of scrolling it.
- **Fix**: Give the chord row a higher flex priority (or drop the wheel's fixed 45% width floor at this breakpoint) so all 7 cards fit, or switch the row to wrap instead of relying on horizontal scroll.
- **Suggested command**: `/impeccable adapt`

**[P2] "Always show diagrams" checkbox silently collapses what you're looking at**
- **Why it matters**: The effect syncing `diagramsExpanded` from `alwaysShowDiagrams` re-runs on every toggle, not just on init. Unchecking "Siempre mostrar diagramas" doesn't just stop persisting the preference — it instantly hides the diagram grid you were currently looking at (and the checkbox disappears with it, since both live inside the same conditional block).
- **Fix**: Decouple "remember for next time" from "show right now" — the effect should only seed initial state, not re-sync on every user toggle.
- **Suggested command**: `/impeccable harden`

**[P2] Metronome lacks its own visual identity**
- **Why it matters**: It's the one new element that reads as generic — a round icon button + number input styled exactly like the theme/language toggle pills, with no beat indicator, waveform, or pulse animation to visually confirm it's playing while sighted users watch (aria-pressed/aria-label are correctly wired for screen readers, so this is a sighted-user-only gap).
- **Fix**: Give it a small on-brand touch — a pulsing glow or dot synced to the beat would both fix the Heuristic-1 visibility gap and match the product's neon identity instead of borrowing the toggle-button style wholesale.
- **Suggested command**: `/impeccable delight`

**[P3] Enharmonic spelling can look like a misread, not a choice**
- Typing sharp-spelled chords (`F#, C#, D#m`) resolves correctly but displays as the flat-spelled key name ("Db Mayor") with no indication this is an equivalent spelling rather than a misunderstanding. Likely intentional (each wheel position has one canonical spelling), but a one-line "shown as its flat equivalent" note would remove the doubt.
- **Suggested command**: `/impeccable clarify`

## Persona Red Flags

**Jordan (First-Timer)**: The "Mostrar círculo de quintas en vivo" checkbox has zero explanation of what "live" means before it's checked — a first-timer has to check it and start typing before understanding what it does. Landing on the Theory tab and immediately needing to scroll to see the tonic chord (P1) is also a bad first impression of the tool's most information-dense screen.

**Riley (Stress-Tester)**: Found the BPM digit-typing bug (P0) in seconds — clear-and-retype is the most natural way to interact with a number field, and it's broken. On the other hand, invalid chord strings ("Xyz, Q#, Foo") are genuinely stress-test-hardened and held up cleanly.

**Alex (Power User)**: No tap-tempo, no BPM keyboard shortcuts beyond the native spinner, no way to jump straight to one diatonic chord's diagram without scrolling past the wheel. The metronome and Theory tab both feel like first-draft conveniences rather than power-user tools; the one clear win for this persona is the chord progression carrying across tabs automatically.

## Minor Observations

- Metronome's `aria-pressed` and `aria-label` swap (`Reproducir metrónomo` / `Pausar metrónomo`) are correctly wired — screen-reader users get real state info even though sighted users get weak visual feedback.
- The "Common Progressions" cards at the bottom of the Theory tab (mood/genre tags, transpose select, Expandir/Copiar/Condimentar) are richer than anything in this review's scope and worth protecting in any future pass.
- Footer credit line is a nice authentic touch reinforcing the "built by someone who plays guitar" feeling.
- Detector's own count label said "20 anti-patterns" but logged 22 distinct console lines — a minor detector-internal discrepancy, not an app issue.

## Questions to Consider

1. The Rhythm-tab live wheel preview and the Theory-tab wheel show near-identical information one click apart — should the preview exist standalone, or should "Rhythm" just deep-link into Theory with the progression pre-selected?
2. The metronome has no visible beat pulse — was audio alone judged sufficient, and has it been tested with the tab muted or under a browser's autoplay-block policy?
3. Was "Always show diagrams" meant to control current+future visibility together, or did that fall out of how the effect was written — should it be two separate signals?
