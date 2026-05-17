# feat: image hints (click-to-reveal + shown-from-start)

## Summary

Teachers can now attach photos to questions. Two flavors because the same
"image hint" needs two different UX flows:

- `image` — behaves like text/jongsung/vowel hints. Teacher clicks a
  reveal button during class; the image appears for the students.
- `image_intro` — pinned, like the category label. Visible from the
  moment the question loads. No reveal button.

Files live in a private Supabase Storage bucket (`hint-images`, 5MB cap,
JPG/PNG/WebP/GIF). The play screen renders them via short-lived signed
URLs.

Final PR in the three-PR series (PR A: #10, PR B: #11 already merged).

## DB / Storage (`supabase/migrations/0004_image_intro_hint_and_storage.sql`)

> **The user applied this migration manually in the Supabase Dashboard SQL Editor.**

Three things:
1. Extend `hints.type` CHECK with `image_intro` (`image` was allowed since v1 but never exposed in the form)
2. Create private bucket `hint-images` (5MB limit, four image MIMEs)
3. Three `storage.objects` RLS policies (SELECT/INSERT/DELETE) gated on `(storage.foldername(name))[1] = auth.uid()::text`

Object key convention: `{auth.uid()}/{uuid}.{ext}` — RLS only inspects
the first folder segment, so the structure could go deeper, but flat is
simpler.

## Code changes

### Server actions

#### New [hint-image-actions.ts](src/app/admin/hint-image-actions.ts)
- `uploadHintImageAction(FormData)` — validates size/MIME/extension, uploads under `{user.id}/{uuid}.{ext}`, returns the path
- `deleteHintImageAction(path)` — RLS + user-folder prefix double-check then removes

#### [admin/actions.ts](src/app/admin/actions.ts) (quiz delete)
- Collect all `image`/`image_intro` paths inside the quiz before deleting it
- After the `quiz_sets` delete, batch-remove the Storage files (best-effort)
- The RDB cascade drops hint rows but Storage doesn't auto-clean, so this is required

#### [admin/edit/[id]/actions.ts](src/app/admin/edit/[id]/actions.ts) (quiz edit)
- Snapshot existing image paths before the delete-and-replace
- After the save, remove paths that aren't referenced by the new hint set

### Form UI ([QuizForm.tsx](src/app/admin/QuizForm.tsx))

- `HINT_TYPE_LABELS` gains `image` / `image_intro` with clear Korean labels
- New `ImageHintEditor` component:
  - File pick → instant thumbnail via `URL.createObjectURL`
  - Background upload via server action → on success swap `hint.content` to the returned path
  - **Replace cleans up the previous path immediately** (minimizes orphans)
  - Edit-mode mount fetches a 1-hour signed URL via `createSignedUrl` (RLS guarantees only own files)
- Tour step now describes all 6 hint types and the 5MB / format limit

### Play screen

#### [play/[id]/page.tsx](src/app/play/[id]/page.tsx)
- Collect every image path and batch-sign with `createSignedUrls` (one round-trip)
- 6-hour TTL — long enough for a full class without refresh, short enough that any leaked link is dead by next day
- Pass `hint.imageUrl` through to PlayClient

#### [play/[id]/PlayClient.tsx](src/app/play/[id]/PlayClient.tsx)
- **image_intro**: auto-rendered below the category, above the answer glyphs (`max-h-[35vh] max-w-[45vw] object-contain`)
- **image** (reveal-style): rendered below the answer glyphs alongside revealed text hints
- New "이미지 힌트" reveal button for `image` only; `image_intro` skips the button row entirely

## Key design decisions

### Why two types instead of `is_pinned` boolean

The request was for the two specific flows. A boolean column generalizes
to "any hint can be pinned", but there's no plan to pin reveal hints —
adding the column would be premature. **A single new enum value is the
smallest change** that satisfies the requirement.

### One hint = one image

Reveal hints store multiple indices in a single row, but for images a
1:1 row-to-file mapping is more natural. "Multiple images" = add more
image hints. The play screen also benefits — each reveal button maps to
exactly one image.

### Server action upload (not direct client)

RLS would protect a direct client upload equally well, but keeping
validation and key-generation in one server location makes future policy
changes a single-file diff. The client never picks the path.

### Storage RLS on the first folder segment

`(storage.foldername(name))[1] = auth.uid()::text` is the Supabase
canonical pattern. Per-teacher folder isolation prevents cross-teacher
file exposure. Server-side key generation enforces the same prefix.

### Private bucket + signed URLs

Public bucket = anyone with the path can download (link-leak risk).
Private + 6h signed URL expires before the next class, balancing
convenience and safety. Play page is SSR so we batch-sign on the server.

### Orphan cleanup at save/delete boundaries only

Replacing or removing an image triggers immediate Storage cleanup at
save time. Not perfect (e.g. window-close mid-upload won't trigger it),
but covers the common flows. A proper cron-based sweeper is a v2 task.

### `e.returnValue = ''` deprecation hint

[QuizForm.tsx:281](src/app/admin/QuizForm.tsx#L281) shows an IDE
deprecation hint; the code predates this PR and modern browsers honor
`e.preventDefault()` alone for leave warnings. Out of scope here.

## Verification

- [x] `npm run lint` passes
- [x] `npm run build` passes (TypeScript included)
- [ ] **Migration must be applied**: run `0004_image_intro_hint_and_storage.sql` in the Dashboard
- [ ] Manual smoke test:
  - Create form: add image / image_intro hint → upload → thumbnail shows
  - Replace photo → previous path disappears in Storage Explorer
  - Delete photo → returns to empty state
  - Save → play screen shows image_intro under the category, image after clicking the reveal button
  - Edit mode loads existing thumbnails via signed URL
  - Deleting the quiz also cleans Storage files

## Follow-ups

- Periodic orphan-cleanup cron (Supabase Edge Function)
- Multiple images per hint, if needed
- Client-side image compression (mobile photos often exceed 5MB)
