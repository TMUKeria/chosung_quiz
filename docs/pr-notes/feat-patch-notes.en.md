# feat: in-app patch notes (unread indicator + auto popup)

## Summary

Lets the teacher see "what changed in this update" right inside the app.
When a new version ships, the modal auto-opens on first visit and an
unread red dot appears on the header button.

Like a game's "update notes" — so users don't miss new features or fixes.

## Changes

### 1. Changelog data — single source of truth ([changelog.ts](src/lib/changelog.ts))

- `CHANGELOG` array holds per-version entries, newest first.
- Each entry: `version` · `date` · `title?` · `changes[]` (`type: 'feat' | 'fix'` + Korean text).
- `LATEST_VERSION` = `CHANGELOG[0].version` — the "unread" baseline.
- Shipping a new version = **add one entry at the top of this file**.

### 2. PatchNotesButton ([PatchNotesButton.tsx](src/app/admin/PatchNotesButton.tsx))

- "업데이트" button + unread red dot in the admin header.
- On mount, compares last-seen version in `localStorage` with `LATEST_VERSION`;
  if different, auto-opens the modal and shows the dot.
- Closing records the latest version as seen (localStorage) and clears the dot.
- A11y: `role="dialog"` · `aria-modal` · ESC to close · focus trap · focus
  returns to the trigger on close.
- `feat` / `fix` badges distinguish entry types.

### 3. Wired into admin header ([admin/page.tsx](src/app/admin/page.tsx))

- `<PatchNotesButton />` placed left of the logout button.

### 4. Version bump (`package.json` → `1.1.0`)

- Groups features merged after 1.0.2 but never versioned (image hints,
  font-size slider, guide improvements) together with patch notes as v1.1.0.
- Semantic Versioning: new features → bump the MINOR digit.

## Key design decisions

### Changelog lives in code, not the DB

This is a single-teacher tool, so the changelog is decided by the developer
at release time. A version-controlled `.ts` file (no table/migration) stays
in sync with git history and makes adding a version a one-liner.

### "Seen" is recorded in the close handler, not an effect

Putting `localStorage.setItem` in an effect triggers the
`react-hooks/set-state-in-effect` warning and extra renders. Recording once
on close is both semantically clear ("done reading") and lint-clean.

### localStorage only inside useEffect

`localStorage` doesn't exist during SSR, so it's accessed only after mount
(same pattern as PlayClient's font-size persistence), avoiding hydration
mismatch.

## Verification

- [x] `npm run lint` passes
- [x] `npm run build` passes (incl. TypeScript)
- [ ] Manual:
  - Fresh/incognito browser → modal auto-opens on admin with red dot
  - Close modal → dot gone, reload doesn't auto-open
  - Click "업데이트" again → modal opens normally
  - ESC / backdrop click closes; Tab cycles within the modal only

## Note

Independent of PR #13 (hint validation), so branched from `origin/main`.
Keeping them separate makes review/rollback easy.
