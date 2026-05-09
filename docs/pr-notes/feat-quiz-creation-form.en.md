# feat: quiz creation form

## Summary

Dynamic creation form for teachers to author quiz sets. Questions and hints
can be added, removed, and reordered freely; chosung preview is computed
live from the answer; hints come in four types (text + three syllable
reveal levels).

## Changes

### Two migrations (0002 + 0003)

- `0002_quiz_creation_form_support.sql`
  1. Extend `hints.type` CHECK to include `reveal_vowel`.
  2. Add nullable `category` text column to `questions`.
- `0003_replace_reveal_jamo_with_syllable_hints.sql`
  1. Replace `reveal_jamo` with `reveal_jongsung` and `reveal_syllable`.
  2. Final set: `'text' | 'image' | 'reveal_jongsung' | 'reveal_vowel' | 'reveal_syllable'`.

> 0003 supersedes 0002's `reveal_vowel` addition, but migrations stay
> additive (history, not desired-state). Same principle as git commits.

### CLAUDE.md spec updates

- Category: per-question free text, always shown to students as the very
  first hint when presentation starts.
- `reveal_jamo` removed: in a chosung quiz the initial consonants are
  already on screen, so single-jamo reveals are usually zero-information.
- Three-tier syllable hints: jongsung only / consonant+vowel (no jongsung) /
  whole syllable.
- The "vowel hint toggle" auto-generation is gone; the teacher explicitly
  picks which syllable to reveal.
- Final layout for jongsung-only inline composition (jamo list / parens /
  separate area) is deferred to PR #7.

### Hangul utility — `src/lib/utils/hangul.ts`

Three new functions:
- `countHangulSyllables(text)` — count of Hangul syllables.
- `splitHangulSyllables(text)` — Hangul syllables only, as an array
  (whitespace stripped).
- `hasJongsung(syllable)` — whether the syllable has a final consonant.
  `(code - 0xAC00) % 28 !== 0`.

### Creation form — `src/app/admin/new/`

- `page.tsx` — server component shell.
- `form.tsx` — client component, `useState`-driven dynamic form state.
- `actions.ts` — server action, inserts quiz_set → questions → hints in
  that order so RLS ownership chains pass.

Hint type behavior:
- **text** → free input.
- **jongsung / vowel / whole syllable** → choose a syllable from the
  answer via clickable chip buttons (1-syllable-per-chip).
- **jongsung** + syllable without jongsung → that chip is disabled with
  a hover hint so the teacher can't store a meaningless hint.

## Key design decisions

### Drop single-jamo reveal in favor of three syllable tiers

In a chosung quiz, all initial consonants are already visible to the
student. A single-jamo reveal of one of those consonants conveys no new
information. Splitting into jongsung / vowel-with-no-jongsung / whole
syllable lets teachers dose information precisely.

### From auto-generated rows to teacher-picked syllable

The earlier toggle auto-created one hint row per syllable, which forced
every syllable to be revealed in the same way. Letting the teacher pick
which syllable to reveal — and at which depth — is far more flexible
and matches how teachers actually plan a class.

### `useTransition` + direct server action call

The auth pages use `useActionState` + `<form action={...}>`. This form
holds nested array state in `useState`, so we skip FormData serialization
and call the server action directly inside `startTransition` for pending
UX. Cleaner for nested data shapes.

### Block invalid input at the form, not at the DB

`reveal_jongsung` chips are disabled for syllables with no jongsung. We
could let the DB or the action reject these, but blocking them visually
is faster feedback and avoids meaningless hint rows entirely.

## Test plan

- [x] `npx tsc --noEmit` — passes.
- [x] `npm run lint` — clean.
- [x] Manual scenarios in the browser:
  1. Answer input → live chosung preview.
  2. Category input.
  3. Each of the four hint types adds correctly; chip selection works.
  4. Jongsung chips disable on syllables without a final consonant.
  5. Hint reorder via ↑↓ buttons.
  6. Question add / remove.
  7. Save redirects to `/admin`; rows appear in `quiz_sets`,
     `questions`, and `hints`.

## Follow-ups

- **PR #5** `feat: quiz list & edit & delete` — admin list page that
  consumes what we just saved.
- **PR #7** `feat: presentation mode + hint reveal` — actual presentation
  screen and the helpers that compose syllables on screen. Decide the
  jongsung inline rendering (jamo list / parens / separate area) there.
- Image hints — separate PR. Supabase Storage bucket + RLS + upload UI.
