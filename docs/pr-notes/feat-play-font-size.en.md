# feat: live font-size slider on the play screen

## Summary

Teachers can now resize the answer text on the play screen in real time
to match their classroom (monitor size, student vision, seating layout).

- Range input from 4rem to 16rem (step 0.5)
- Instant on-screen feedback — the slider *is* the preview
- Remembered via localStorage (next lesson restores the last size)
- "기본값" (default) button to snap back to 8rem

## Changes (`PlayClient.tsx`)

### 1. Constants

```ts
const FONT_SIZE_STORAGE_KEY = 'chosung-quiz-play-font-size'
const FONT_SIZE_DEFAULT = 8   // rem (≈ Tailwind text-9xl)
const FONT_SIZE_MIN = 4
const FONT_SIZE_MAX = 16
const FONT_SIZE_STEP = 0.5
const JONGSUNG_SIZE_RATIO = 0.5  // jongsung row is 50% of the main glyph
```

### 2. State + localStorage sync

- On mount: restore from localStorage (default 8rem if missing)
- Parsed value is clamped: `Math.min(MAX, Math.max(MIN, parsed))`
- Each slider change writes back to localStorage

### 3. Dynamic font-size

Answer display, `SyllableDisplay`, and the jongsung row all use **inline
`style={{ fontSize: ... }}`** instead of Tailwind size classes.

The jongsung row uses `fontSize * 0.5` rem — matches the previous
Tailwind text-9xl / text-6xl ratio (≈ 0.47).

### 4. Slider toolbar

A new row above the footer:

```
글자 크기  [─────●──────]  8.0 rem  [기본값]
```

- `<label>` + `<input type="range">` + live numeric readout + reset button
- `aria-label="정답 글자 크기 조정"` for screen-reader context
- `flex-wrap` so it survives narrow screens

## Key design decisions

### Slider over preset buttons

Original plan had a 4-step toggle (small/medium/large/xlarge). The user
asked for "직접 정할 수 있게" — direct control. A slider in one row gives
finer adjustment for varied student vision.

### Inline style instead of Tailwind classes

Tailwind compiles at build time, so `text-[Xrem]` from a runtime variable
won't work; even arbitrary-value syntax must appear statically. Font-size
therefore goes through inline style. Other visual properties (weight,
tracking) stay in Tailwind — separation of concerns.

### Preview = the screen itself

No separate preview modal. Dragging the slider resizes the answer
glyphs immediately, so the live screen is the preview. No "apply"
confirmation step.

### Jongsung scales proportionally

Previously `text-6xl` (≈3.75rem) — about 0.47 of `text-9xl`. Now an
explicit 0.5 ratio so the jongsung row scales smoothly with the slider
without visual jitter.

### Only the answer text resizes

Hints, category label, header, and footer keep their original sizing.
The answer glyph is where student attention lives; scaling unrelated
elements would risk layout breaks on narrow screens.

## Verification

- [x] `npm run lint` passes
- [x] `npm run build` passes (TypeScript included)
- [ ] Manual smoke test:
  - `/play/[id]`: dragging the slider resizes syllables live
  - Reload restores last value
  - Reveal a syllable with a final consonant — jongsung row scales too
  - "기본값" resets to 8rem
  - Fullscreen toggle preserves slider value and glyph size

## Follow-ups

- PR C: image hints (Supabase Storage)
  - Two new types: `image` (click to reveal) + `image_intro` (shown from start)
