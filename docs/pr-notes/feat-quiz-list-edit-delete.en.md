# feat: quiz list, edit, delete

## Summary

Admin flow for browsing, editing, and deleting quizzes. The creation form is
generalized so the edit page reuses it with `initialData`. Unsaved changes
trigger a leave-warning before navigation.

## Changes

### Quiz list — `/admin`

The home page used to be a single "create quiz" CTA. It is now a list of the
teacher's quizzes plus that CTA.

- `src/app/admin/page.tsx` — server component. RLS scopes the query to the
  signed-in teacher with no `where teacher_id = ?` clause.
- `src/app/admin/QuizCard.tsx` — client component card with present / edit /
  delete buttons.
- Empty state: "no quizzes yet" prompt.

### Form generalization — `NewQuizForm` → `QuizForm`

The create-only form is gone. One reusable component handles both modes.

- `src/app/admin/QuizForm.tsx` — accepts `mode: 'create' | 'edit'`,
  `initialData?`, and `onSave` props.
- `src/app/admin/quiz-form-types.ts` — extracted shared types
  (`HintType`, `SaveQuizInput`, ...).

### Edit page — `/admin/edit/[id]`

- `src/app/admin/edit/[id]/page.tsx` — fetches `quiz_set` + `questions` +
  `hints` in a single nested select, hands them to `QuizForm` as
  `initialData`.
- `src/app/admin/edit/[id]/actions.ts` — `updateQuizAction`.

### Server actions

- `deleteQuizAction` in `src/app/admin/actions.ts`. ON DELETE CASCADE
  removes children automatically.
- `updateQuizAction` uses delete-and-replace: drop the quiz set's questions
  (cascading hints) and re-insert the new state.

### Leave-warning UX

If the user changed anything in the form and tries to leave without saving:
- In-app navigation (back link) → `confirm()` dialog.
- Browser-level (refresh / close tab / change URL) → `beforeunload`.

## Key design decisions

### Reuse the form, gate it with a `mode` prop

The create and edit forms are nearly identical. Splitting them into two
components would duplicate ~250 lines and create drift opportunities. A
single `<QuizForm mode={...} initialData={...} onSave={...} />` keeps a
single source of truth.

### `updateQuizAction.bind(null, id)` for partial application

The edit page server component does:
```ts
const onSave = updateQuizAction.bind(null, id)
```

This pre-binds the quiz id and exposes a `(input) => ...` function — same
shape as the create page's `saveQuizAction`. The form is mode-agnostic.

### Delete-and-replace on update

`updateQuizAction` does not diff the questions. It deletes them all and
re-inserts from the form payload. Cascade handles hints. Diff logic was
not worth the complexity for our scale.

> Tradeoff: question/hint primary keys change on every edit. Fine for us
> (no external links to those rows); would be inappropriate if we exposed
> question IDs to other systems.

### Two leave-warning paths

`isDirty` flag flips on any state mutation. Two listeners:
1. The "back" button calls `confirm()` before `router.push('/admin')`.
2. A `beforeunload` listener triggers the browser's native warning on
   refresh / tab close.

`handleSave` clears `isDirty` at the start so the redirect doesn't
re-trigger the warning. On error it restores `isDirty = true`.

## Notable patterns

- **Component generalization** — `mode` + `initialData` is a baseline React
  pattern for shared form/screen logic.
- **`Function.prototype.bind`** for server action partial application.
- **RLS over filter clauses** — security at the DB layer, not in app code.
- **PostgREST nested count** — `.select('id, title, questions(count)')`.
- **`beforeunload`** — message text is browser-controlled; setting
  `e.returnValue = ''` is just the trigger.

## Test plan

- [x] `npx tsc --noEmit` — passes.
- [x] `npm run lint` — clean.
- [x] Manual flows:
  1. List shows only the signed-in user's quizzes.
  2. Create flow still works; new quiz appears on the list immediately.
  3. Edit page hydrates the form from existing data.
  4. Save updates persist.
  5. Delete confirms then removes the card.
  6. Modify-then-leave triggers `confirm()`.
  7. Modify-then-refresh triggers the browser warning.
  8. Leaving without changes is silent.
  9. Successful save redirects without re-warning.

## Follow-ups

- **PR #6** `feat: presentation mode` — replace `/play/[id]` placeholder
  with the actual presentation screen. Decide the jongsung inline render
  (jamo list / parens / separate area) there.
- Modal-based delete confirmation to replace `window.confirm()`.
