# Current State

Last updated: 2026-05-20

## What This Is

This repo is a new scaffold for a faithful multilingual purity-test app.

## Confirmed Direction

- The test should preserve the canonical wording, order, and scoring.
- Translation files should be easy to add one language at a time.
- The first implementation should be small: checklist, language switcher, score result, and local-only state.
- Stats should wait until the core test works, and should be opt-in if added.

## Current Files

- `content/tests/rice-classic/manifest.json`: test metadata and language registry.
- `content/tests/rice-classic/en.json`: source-language structure, awaiting canonical item text.
- `content/tests/rice-classic/ja.json`: Japanese translation structure, kept incomplete until source items are finalized.
- `content/tests/rice-classic/vi.json`: Vietnamese translation structure, kept incomplete until source items are finalized.
- `content/ui.json`: English, Japanese, and Vietnamese interface strings.
- `index.html` and `src/`: no-build static web app shell.
- `scripts/validate-content.mjs`: content validator.
- `docs/plans/MVP.md`: first implementation slice.

## Next Step

Fill `content/tests/rice-classic/en.json` with the exact canonical source items, then run:

```bash
npm run validate:content
```

Use strict validation only after the canonical item list has been added:

```bash
npm run validate:content:strict
```
