# chore: spec update for vowel hint and in-app guide

## Summary

After reviewing the reference site (Gemini Canvas) built by the requesting
teacher, two UX requirements that were missing from the current spec are now
folded into `CLAUDE.md`. **No code or DB changes** — docs only, +48 / -10.
Implementation is deliberately deferred and absorbed into the existing PR
chain (`#4`, `#6`, `#7`, `#8`).

## Changes

### 1. Vowel hint (`reveal_vowel`)

- New hint type alongside existing `text` / `image` / `reveal_jamo`.
- Behavior: compose chosung + jungsung to a partial syllable.
  `ㅅ ㄱ` → `사 ㄱ` → `사과`.
- UX: the teacher only flips a single "use vowel hint ON/OFF" toggle;
  vowels are auto-extracted from the answer and one `reveal_vowel` row is
  auto-generated per syllable.
- `hints.content` is a 0-based integer string identifying which syllable
  position to reveal.

### 2. In-app usage guide

- A `?` icon in the right side of every page header opens a modal.
- Per-page content for `/admin/new`, `/admin`, and `/play/:id` (each short
  enough to scan in under a minute).
- Component split: `<HelpButton />` (in the header) plus `<HelpModal page="...">`.
- Accessibility requirements pinned: ESC to close, focus trap,
  `aria-modal="true"`.

### 3. `hangul.ts` extension signatures

Function signatures defined in advance for the upcoming implementation PRs:

```ts
getJungsungIndex(syllable: string): number | null
composeChoJung(choIdx: number, jungIdx: number): string
revealVowelAt(answer: string, index: number): string
```

### 4. Annotated PR order

- PR #1, #2 marked ✅
- PR #4 quiz creation form: **vowel hint toggle** + `hints.type` CHECK
  migration adding `reveal_vowel`
- PR #6 presentation mode: **header `?` help modal scaffolding**
- PR #7 hint reveal: handle `reveal_vowel` via `revealVowelAt`
- PR #8 docs README: finalize per-page modal content

## Key design decisions

### Absorb rather than split into separate PRs

Splitting this into a tiny docs PR plus a standalone schema PR would
fragment the work. Agreeing on the spec first lets the next feature PR
land both the UI and the migration in one coherent change, with a single
review context.

### `reveal_vowel.content` = 0-based syllable index (as a string)

By auto-generating one `reveal_vowel` row per syllable and storing the
position in `content`, hints of all four types (`text`, `image`,
`reveal_jamo`, `reveal_vowel`) can be **interleaved in any order**. For
example: text hint → reveal first vowel → image hint → reveal second
vowel. The simpler alternative (a single `vowel_hint_enabled boolean`
on `questions`) loses that ordering flexibility.

## Test plan

- [x] `git diff CLAUDE.md` — +48 / -10, all five spec items applied
- [x] No code or DB changes → build/test unaffected
- [ ] (Follow-up) Confirm the next PR (#3 `feat: teacher auth`) picks up
      the updated spec naturally

## Follow-ups

- Proceed to PR #3 `feat: teacher auth`.
- Don't forget the `hints.type` CHECK extension migration promised in
  PR #4 — track on the PR's own checklist.
