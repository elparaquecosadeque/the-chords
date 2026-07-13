# Handoff: The Chords — Angular Wrapper App

**Created:** 2026-07-13  
**Branch:** `master`  
**Session Duration:** project analysis

---

## Summary

`the-chords` is a minimal Angular 22 shell app wrapping two published npm packages — `@gblp/chord-finder` and `@gblp/circle-of-fifths` — into a single deployable SPA. The shell provides shared infrastructure: sticky topbar navigation, dark/light theme toggle, EN/ES language toggle, a shared footer, and GitHub Pages CI/CD. The app is live at https://elparaquecosadeque.github.io/the-chords/chord-finder.

---

## Work Completed

### Changes Made

- [x] Shell layout: sticky topbar (nav + brand + preferences), `<router-outlet>`, footer with social links
- [x] `PreferencesService`: Angular signals for `theme` and `language`, persisted to `localStorage`
- [x] `LocalizationService`: computed dictionary keyed by language signal (EN/ES)
- [x] `App` component: applies `lang` attribute to `<html>` via `effect()`
- [x] Lazy-loaded routes for `/chord-finder` and `/circle-of-fifths` (wildcard redirects to chord-finder)
- [x] GitHub Pages deploy workflow (push to `master` → `npm run build:gh-pages`)
- [x] Font Awesome for social icons (GitHub, LinkedIn in footer)
- [x] Responsive topbar: stacks vertically under 760 px
- [x] Hides package's own footer: `the-chords-chord-finder .app-footer { display: none }`

### Key Decisions

| Decision | Rationale | Alternatives Considered |
|---|---|---|
| Angular signals for preferences | Reactive, no extra state lib needed | NgRx, BehaviorSubject |
| `localStorage` directly in service constructor effects | Simple, no abstraction needed for two keys | Storage abstraction layer |
| Localization via computed dictionary in service | No routing or i18n lib overhead for two languages | `@angular/localize`, ngx-translate |
| `data-theme` attribute on `.shell` for theming | CSS custom properties scoped to the shell wrapper | Class-based theming, body attribute |
| `skipTests: true` globally in angular.json | Wrapper app has no logic to unit test | Per-component skip |

---

## Files Affected

### Source Files

- `src/app/app.ts` — root component; injects preferences + localization, toggles via methods
- `src/app/app.html` — shell template: topbar, `<router-outlet>`, footer
- `src/app/app.scss` — CSS custom properties for both themes, layout for topbar/footer, responsive breakpoint
- `src/app/app.routes.ts` — routes: `''` → `chord-finder`, two lazy-loaded pages, wildcard fallback
- `src/app/app.config.ts` — Angular app config (router provider)
- `src/app/preferences.service.ts` — `theme` and `language` signals + localStorage persistence
- `src/app/localization.service.ts` — computed EN/ES string dictionary
- `src/app/chord-finder-page.ts` — thin wrapper: passes `language` signal to `<the-chords-chord-finder>`
- `src/app/circle-of-fifths-page.ts` — thin wrapper: passes `language` signal to `<the-chords-circle-of-fifths>`
- `src/styles.scss` — global reset, font stack, FA imports, package footer hide rule
- `src/main.ts` — Angular bootstrap
- `src/index.html` — HTML entry point

### Config

- `angular.json` — build config, `skipTests: true` schematics-wide, `build:gh-pages` base-href
- `package.json` — dependencies and scripts
- `.github/workflows/pages.yml` — CI/CD: push master → build → deploy GitHub Pages

### Reference

- `ideas.md` — **uncommitted changes present** — 3 backlog feature ideas (see Next Steps)
- `README.md` — setup instructions and demo link

---

## Technical Context

### Architecture

```
App (shell)
├── PreferencesService  → theme signal, language signal (localStorage-persisted)
├── LocalizationService → computed EN/ES dictionary from language signal
├── /chord-finder       → ChordFinderPage → <the-chords-chord-finder [language]>
└── /circle-of-fifths   → CircleOfFifthsPage → <the-chords-circle-of-fifths [language]>
```

The shell owns all chrome (nav, theme, language, footer). The routed pages are one-liners that pass `language` into the respective package component. Both packages handle their own internal state and styling; the shell only threads the language preference through.

### Dependencies

| Package | Role |
|---|---|
| `@gblp/chord-finder@0.3.4` | Chord finder component |
| `@gblp/circle-of-fifths@0.3.0` | Circle of fifths component |
| `@fortawesome/fontawesome-free@^7.3.0` | Social icons in footer |
| `@angular/*@^22.0.0` | Framework |

### Configuration

- Theme and language stored in `localStorage` under keys `the-chords-theme` and `the-chords-language`
- Default theme: `dark`; default language: `en`
- GitHub Pages base href: `/the-chords/` (set via `build:gh-pages` script)
- Node 24, npm 11 used in CI

---

## Things to Know

### Gotchas & Pitfalls

- **Package footer**: `@gblp/chord-finder` renders its own `.app-footer`; it is hidden via a global rule in `styles.scss`. If the package selector changes on upgrade, the footer will reappear.
- **Base href**: `npm run build` (no base href) is for local/non-subpath deploys. `npm run build:gh-pages` sets `/the-chords/`. Using the wrong script breaks routing on GitHub Pages.
- **Signal reactivity**: `PreferencesService` uses `effect()` to sync localStorage — effects run in injection context; do not call `preferences.theme.set()` outside Angular's reactive context.
- **No tests**: `skipTests: true` is set globally in `angular.json`. The project has no test infrastructure.

### Assumptions Made

- Only two languages (EN/ES) — adding a third requires extending the `LocalizationService` dictionary type.
- Only two themes (dark/light) — toggle is a binary flip.
- Packages are consumed as Angular Elements / standalone components and accept a `[language]` input.

### Known Issues

- `ideas.md` has local uncommitted changes (3 feature ideas added).
- No 404 fallback page for GitHub Pages (SPA routing works via wildcard redirect in-app but a direct URL hit to a non-root route will 404 on Pages without a custom `404.html`).

---

## Current State

### What's Working

- Full app deployed and live: https://elparaquecosadeque.github.io/the-chords/chord-finder
- Theme toggle (dark/light) with localStorage persistence
- Language toggle (EN/ES) with localStorage persistence and `<html lang>` sync
- Both tool pages rendering and functioning
- GitHub Pages CI/CD on push to `master`
- Responsive layout at mobile breakpoint (760 px)

### What's Not Working

- No `404.html` for direct GitHub Pages URL access to non-root routes

### Tests

- [ ] Unit tests: not written (skipped globally)
- [ ] Integration tests: not written
- [ ] Manual testing: app is functional in deployed demo

---

## Next Steps

### Immediate (Start Here)

1. **Commit `ideas.md`** — it has unstaged changes with 3 backlog features, commit or stash before branching.
2. **Add `404.html`** — copy `index.html` to `public/404.html` so GitHub Pages SPA routing works on direct URL access (e.g. sharing `/circle-of-fifths` link).

### Subsequent (from `ideas.md` backlog)

1. **Scale detection in Chord Finder** — when ≥3 chords are entered, determine matching scale and show the Circle of Fifths component alongside with suggested chords. Must preserve existing styles and EN/ES localization.
2. **"Show/Mostrar" modal in Circle of Fifths** — new button beside Expand/Collapse and Copy; opens a modal showing chord fingerings for suggested progression chords. Modal must stay within viewport (two-column layout if needed, no overflow).
3. **Triad chords in chords-db fork** — add triad chord shapes to https://github.com/elparaquecosadeque/chords-db, then bump the package versions that consume it.

### Blocked On

- Ideas 1 and 2 depend on the internal API/inputs of `@gblp/chord-finder` and `@gblp/circle-of-fifths` — review their published interfaces before starting.
- Idea 3 requires work in the separate `chords-db` fork first, then a package release.

---

## Related Resources

### Documentation

- Live demo: https://elparaquecosadeque.github.io/the-chords/chord-finder
- Repo: https://github.com/elparaquecosadeque/the-chords
- chords-db fork: https://github.com/elparaquecosadeque/chords-db
- `@gblp/chord-finder` on npm: https://www.npmjs.com/package/@gblp/chord-finder
- `@gblp/circle-of-fifths` on npm: https://www.npmjs.com/package/@gblp/circle-of-fifths

### Commands to Run

```bash
npm install          # restore dependencies
npm start            # dev server at http://localhost:4200
npm run build        # production build (local/custom deploy)
npm run build:gh-pages  # production build for GitHub Pages (/the-chords/ base href)
```

If you need to find more context:
- `grep -r "languageDictionary\|preferences\." src/` — find all localization/preferences consumers
- `grep -r "gblp" src/` — find all usages of the wrapped packages
- `git log --oneline` — recent commit history

---

*Generated 2026-07-13. One uncommitted change: `ideas.md`.*
