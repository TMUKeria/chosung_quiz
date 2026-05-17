# feat: clearer guide entry label + detailed hint examples

## Summary

Two UX improvements to the create/edit form's tour entry point and hint
explanation.

1. **Replaced the `?` icon button with a `사용 가이드` (User Guide) text
   button** so first-time teachers immediately understand its purpose.
2. **Expanded the add-hint tour step into a per-type bulleted breakdown.**
   Instead of one dense paragraph, each of the four hint types gets its
   own bullet with a concrete example using the answer 「치킨」.

## Changes

### 1. Guide entry label (`QuizForm.tsx`)

Before:
```tsx
<button ... aria-label="가이드 보기">?</button>
```

After:
```tsx
<button ...>사용 가이드</button>
```

- Round 8x8 icon button → standard text button.
- Removed `aria-label` because the visible label now carries the meaning;
  no need for a separate accessible name.

### 2. Tour step content (`TOUR_STEPS` `add-hint`)

Was a single paragraph listing the four hint types. Now a JSX node with a
heading line, four bulleted items (bold type label + Korean quoted
example), and a closing paragraph that keeps the existing rule about
multi-syllable selection and per-cell reveal.

Hint types covered (all examples for 「치킨」):
- **텍스트 (text)** — free-form sentence. e.g. 「닭으로 만든 음식」
- **받침 (jongsung)** — reveals the final consonant only. e.g. ㄴ from 친
- **모음 (vowel)** — reveals onset + nucleus, hides coda. e.g. 「치」, 「키」
- **글자 전체 (full syllable)** — reveals the whole syllable. e.g. 「치」

## Key design decisions

### JSX content in react-joyride

`Step['content']` accepts `string | ReactNode`. JSX gives proper visual
hierarchy (bullets, bold labels) that a single string can't.

### Korean corner brackets 「」 instead of escaping `"`

ESLint's `react/no-unescaped-entities` rejects raw `"` inside JSX text.
Options were `&quot;`, `{'"..."'}`, or switching to Korean quotation
marks. The corner brackets read more naturally in Korean copy *and* avoid
the lint rule entirely — solving two problems at once.

### Guide button stays on form pages only

CLAUDE.md's original spec puts a guide button on every page, but this PR
intentionally narrows scope to label + hint description. Extending the
guide entry to the list and play pages is deferred.

## Verification

- [x] `npm run lint` passes
- [x] `npm run build` passes (TypeScript included)
- [ ] Manual smoke test recommended:
  - `/admin/new`: auto-tour shows the new bulleted hint step
  - Top-right `사용 가이드` button restarts the tour
  - Same behavior in `/admin/edit/[id]`

## Follow-ups

- PR B: font-size adjustment in the play screen
- PR C: image hints via Supabase Storage
