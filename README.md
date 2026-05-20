# Purity Test Localized

Small web app project for a faithful multilingual version of a classic purity-test checklist.

## Goal

Keep the test content, order, and scoring stable while making the experience easier to use in multiple languages.

## Principles

- Faithful translation, not rewriting or modernization.
- Item IDs are the scoring contract.
- Source text remains the canonical reference.
- Results stay local by default.
- Anonymous aggregate statistics, if added, must be opt-in.

## Project Shape

- `content/tests/rice-classic/` stores the test manifest and one JSON file per language.
- `src/` contains the no-build static app.
- `scripts/validate-content.mjs` checks language files before shipping.
- `docs/CURRENT_STATE.md` is the start-here file for future sessions.

## Add A Language

1. Copy `content/tests/rice-classic/en.json` to a new file like `ja.json`.
2. Set `language` and `label`.
3. Translate each item while preserving the original meaning and numbering.
4. Add the language to `content/tests/rice-classic/manifest.json`.
5. Run `npm run validate:content`.

Use `npm run validate:content:strict` before a real content release. Strict mode requires all 100 canonical source items and matching translations.

## Local Preview

```bash
npm run dev
```

Open `http://localhost:5173`.

## GitHub Pages

This is a no-build static app. GitHub Pages can serve it directly from the `main` branch root.
