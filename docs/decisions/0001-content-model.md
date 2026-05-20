# Decision 0001: Translation Files By Language

## Decision

Use one JSON file per language under `content/tests/rice-classic/`.

## Rationale

This keeps language additions simple: create a file, translate matching item IDs, register it in the manifest, and run validation.

## Consequences

- Item IDs are stable across all languages.
- The app can lazy-load only the selected language later.
- Translation review is easy in diffs.
- Content validation is required to catch missing, duplicate, or extra items.

