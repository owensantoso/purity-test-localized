# MVP Plan

## Goal

Build the smallest useful app that lets someone complete the canonical test in a selected language and see their score.

## Scope

- Load test content from JSON files.
- Let the user choose English, Japanese, or Vietnamese.
- Show all items in canonical order.
- Save checked item IDs locally in the browser.
- Calculate score from checked item count.
- Show the final score and checked-count summary.

## Out Of Scope For MVP

- Accounts.
- Server-side storage.
- Global statistics.
- Demographic collection.
- Reworded or alternative test versions.
- Copying third-party source text into the public repo without user-supplied rights or approval.

## Verification

- Content validator passes.
- Changing language preserves checked item IDs.
- Score calculation uses item count and selected IDs, not translated text.
