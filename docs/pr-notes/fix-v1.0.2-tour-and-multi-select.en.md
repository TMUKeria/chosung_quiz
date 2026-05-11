# release: v1.0.2 — auto-start tour + multi-syllable hints / per-cell reveal

## Summary

Two UX touch-ups on top of v1.0.1.

1. The **creation-form tour now starts automatically** on first visit. Before,
   the user had to click a black beacon dot before any spotlight appeared.
2. The **creation form accepts multiple syllables per hint, and the play
   screen splits each hint into one button per syllable** so the teacher can
   reveal just the syllables they want, in any order.

## Changes

### 1. Auto-starting tour (`QuizForm.tsx`)

- Added `skipBeacon: true` to every step — react-joyride v3's option to
  jump straight to the tooltip without the beacon-click gate.
- Kept `beaconComponent={() => null}` as a belt-and-suspenders fallback.

### 2. Multi-syllable hints + per-cell reveal

**Form (`QuizForm.tsx`)**
- Chip click toggles selection. A single hint can target multiple syllables.
- `content` stored as comma-separated indices (e.g. `"0,1"`). No DB schema
  change.
- New `parseSelectedIndices()` helper.

**Play (`PlayClient.tsx`)**
- State: `revealedHints: Set<number>` → `revealedCells: Set<string>`.
  Each cell key is `"<hintIdx>:<syllableIdx>"` (or `"<hintIdx>:text"` for
  text hints).
- A hint targeting N syllables now renders as **N buttons**.
  - Example: vowel hint with syllables 1 + 2 selected →
    `[모음: 1번째]` `[모음: 2번째]`.
- Each button toggles independently — the teacher reveals exactly the
  syllables they want, in any order.
- `applyHintsToSyllables` rewritten around `revealedCells`.

### 3. Tour text emphasis

The "add hint" step now explicitly says **the syllable chip must be clicked
to finish the hint**. The previous wording was ambiguous about that step.

### 4. Release metadata
- `package.json` version `1.0.1` → `1.0.2`.

## Design decisions

### Multi-select in the form, per-cell in play

In the form, splitting one logical hint into separate rows per syllable
clutters the list. Multi-select keeps the teacher's intent ("this hint
covers these syllables") in one place.

At play time, the teacher needs micro-control — reveal one syllable, watch
reactions, reveal another. So we explode the hint into per-syllable
buttons in the play UI only. Same DB row, different presentation.

### String cell keys

`Set<string>` keyed by `"hintIdx:syllableIdx"` is simpler than
`Map<number, Set<number>>` for membership checks and toggles.

### `skipBeacon` is the v3 spelling

v2's `disableBeacon` was renamed to `skipBeacon: boolean` in v3. Found in
the type definition rather than the README, then applied.

## Test plan

- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` clean
- [x] Manual:
  - Incognito → `/admin/new` opens the spotlight immediately (no beacon click)
  - Chip multi-select / deselect in the form works
  - Play screen expands a multi-syllable hint into one button per syllable
  - Buttons toggle independently
  - Jongsung chips on no-jongsung syllables stay disabled

## Follow-ups

- Image hints (Supabase Storage)
- AI-assisted quiz generation (Claude API)
- Modal confirms
