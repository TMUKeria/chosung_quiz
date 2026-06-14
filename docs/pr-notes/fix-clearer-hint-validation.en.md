# fix: clearer hint validation + client-side pre-check

## Summary

User reported that the save kept failing on mobile with "all hints
filled in." The real cause was one of three silent emptiness states
hiding behind a generic error message:

1. `image` / `image_intro` hint added but no file uploaded (Storage path empty)
2. `reveal_*` hint added but no chip selected
3. Whitespace-only text hint

Old message: `모든 힌트의 내용을 입력해주세요.` — doesn't say which
question, which hint, or what's missing.

New example: `문제 2의 3번째 힌트 — 사진이(가) 비어 있어요.`
("Question 2's 3rd hint — the photo is empty.")

## Changes

### 1. New helper [validate-quiz-input.ts](src/app/admin/validate-quiz-input.ts)

- `validateSaveQuizInput(input)` returns `null` on success, Korean error
  string on failure.
- `EMPTY_LABEL_BY_TYPE: Record<HintType, string>` maps each hint type to
  the right Korean noun for "the missing piece":
  - `text` → "텍스트 내용" (text content)
  - `image` / `image_intro` → "사진" (photo)
  - `reveal_*` → "공개할 글자" (syllable to reveal)
- Message includes **question index + hint index** for at-a-glance
  location on mobile.

### 2. Both server actions consume the helper

- [new/actions.ts](src/app/admin/new/actions.ts) — `saveQuizAction`
- [edit/[id]/actions.ts](src/app/admin/edit/[id]/actions.ts) — `updateQuizAction`

Previously both files duplicated the validation block. One source now.

### 3. Client-side pre-check ([QuizForm.tsx](src/app/admin/QuizForm.tsx))

`handleSave` runs the same helper *before* invoking the server action.
On failure: instant on-screen message, no round-trip.

Mobile users see the specific error immediately even on slow networks.

## Key design decisions

### Plain module, importable from client and server

The helper file has no `'use server'` pragma, so both contexts import
and call the same function. Single source of truth, zero drift risk.

### Server validation kept (defense in depth)

The client pre-check is a UX improvement, not a security boundary.
Server re-validates with the same helper so direct API calls or bypassed
clients still get rejected consistently.

### Record map instead of switch

Using `Record<HintType, string>` means adding a new hint type triggers a
TypeScript error if you forget to add a label — the same kind of
compile-time safety net the edit-page whitelist bug from PR C lacked.

## Forgot-password (`krkimys@gw1.kr`) — not a code bug

Email format is valid. Supabase Auth returns success even for
unregistered emails (to prevent enumeration), so the user sees "메일이
발송됐어요" even when no mail was actually sent. Check Dashboard → Auth
→ Users for the address and `email_confirmed_at`. No code change in this
PR.

## Verification

- [x] `npm run lint` passes
- [x] `npm run build` passes (TypeScript included)
- [ ] Manual smoke test:
  - Add image hint, skip upload, save → `... 사진이(가) 비어 있어요.`
  - Add reveal hint, skip chip selection, save → `... 공개할 글자이(가) 비어 있어요.`
  - Whitespace-only text hint → `... 텍스트 내용이(가) 비어 있어요.`
  - Valid input → save succeeds
  - Repeat on mobile (instant feedback, no round-trip)
