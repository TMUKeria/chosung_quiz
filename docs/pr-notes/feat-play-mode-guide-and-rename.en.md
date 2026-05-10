# feat: play mode + guide + rename

## Summary

The play screen students see during class. Inline syllable reveal where
the answer fills in one character at a time, with a separate row beneath
each character for the jongsung (final consonant) — pattern C. Hints are
individual toggle buttons the teacher picks from at any time. A completion
screen appears after the last question. As a bonus, the creation form
gains a spotlight tour for first-time users, and the "발표" / "presentation"
naming is unified to "퀴즈 풀기" / "play".

## Changes

### Play page — `/play/[id]`

- `src/app/play/[id]/page.tsx` — server component, fetches quiz_set +
  questions + hints in one nested select.
- `src/app/play/[id]/PlayClient.tsx` — client component owning all play
  state and reveal logic.
- `src/proxy.ts` — `/play/*` is now also gated to signed-in users.

### Inline syllable reveal (pattern C)

Each syllable renders in two rows:
- top: chosung / consonant+vowel / full syllable depending on its level.
- bottom: jongsung jamo, only when a jongsung hint has fired.

If any cell shows a jongsung, every cell reserves the jongsung row so the
layout doesn't shift between one-line and two-line modes.

### Hints as type-specific toggle buttons

Replaced the old "next hint" sequential reveal with one button per hint.
Teachers tap whichever hint fits the moment.

- `텍스트 힌트` (text hint)
- `받침: 2번째` (jongsung: 2nd syllable)
- `모음: 1번째` (vowel: 1st syllable)
- `글자: 1번째` (whole 1st syllable)

> Labels deliberately avoid printing the syllable itself (e.g. "(킨)"),
> since students see the same screen and the label would leak the answer.

State is a `Set<number>` of revealed hint indices; clicking again toggles
the hint off so a stray click is recoverable.

### Hangul helpers — `src/lib/utils/hangul.ts`

```ts
getJongsung(syllable)  // jongsung jamo or null
removeJongsung(syllable)  // syllable with jongsung stripped
```

Math: `(charCode - 0xAC00) % 28` is the jongsung index. Zero means no
final consonant.

### Completion screen

After the last question's "완료" press:
```
🎉 다 풀었어요!
[다시 풀기] [홈으로]
```

"다시 풀기" rewinds to question 0 and clears every reveal.

### Creation-form spotlight tour (react-joyride)

- Library: `react-joyride@3` (works with Next.js 16 + React 19).
- Six steps: title → answer + chosung → category → add hint → add
  question → save.
- Auto-runs on first visit in `mode === 'create'`, tracked via
  localStorage. The edit page never auto-runs (the user editing already
  knows the form).
- A `?` button in the header re-runs the tour.

> Originally added to the play page; reverted to the form per user
> feedback ("guidance is needed when authoring, not when running the
> quiz live").

### "발표" → "퀴즈 풀기" rename

Quiz card button label, CLAUDE.md spec table, data model comments,
in-app guide entries, and roadmap step.

## Key design decisions

### Pattern C for jongsung display

Considered:
- A: jamo on the same line (`ㅋㄴ`) — looks like an extra phantom letter.
- B: parens (`ㅋ(ㄴ)`) — readable but clunky in a class display.
- C: separate row beneath each cell — chose this. Hangul cannot fuse a
  consonant + final consonant without a vowel anyway, so the jongsung is
  always laid out separately. Reserving the row prevents layout shifts.

### Toggle hints rather than sequential

A "next hint" button forces every hint to fire in author order. A teacher
running a class wants to dose individual hints based on student
reactions. Per-hint toggle is the lighter-weight UX for that.

### Tour on creation, not on play

The play screen is the teacher's tool in front of students. The teacher
should already know it. The author flow is where help actually pays off.

### `useEffect` `setState` ESLint disable

React 19's `react-hooks/set-state-in-effect` rule. Our case (read once
from localStorage on mount) is a true effect, not a cascading render.
Disabled per call site rather than globally.

## Notable patterns

- **Hangul syllable decomposition** with raw arithmetic, no library.
- **`Set<number>` for toggle state** — O(1) membership + immutable
  update with `new Set(prev)`.
- **`fullscreenchange` event** to track ESC-driven exits, since the
  React state otherwise drifts from the browser's actual fullscreen
  status.
- **react-joyride v3** quirks: named `Joyride` import, `onEvent` callback
  (not `callback`), `disableBeacon` removed.

## Test plan

- [x] `npx tsc --noEmit` passes.
- [x] `npm run lint` passes.
- [x] Manual:
  - Tour auto-runs once on `/admin/new`; "skip" / "next" both end it
    and write the storage key.
  - `?` button re-runs the tour.
  - `/admin/edit/[id]` doesn't auto-run.
  - Play page shows category + chosung on entry.
  - Hint buttons toggle on/off; jongsung hint shows the jamo beneath
    the cell with no layout shift.
  - Show answer / fullscreen / prev / next all behave.
  - Last "완료" goes to the completion screen; "다시 풀기" rewinds.

## Follow-ups

- **PR #7** `docs: README + demo link` — portfolio polish, deploy URL,
  screenshots.
- Modal-based confirms in place of `window.confirm()`.
- Image hints (separate PR — Supabase Storage).
- AI-assisted quiz generation (separate PR — Claude API).
