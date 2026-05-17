-- =============================================================================
-- Migration: 0004_image_intro_hint_and_storage
-- Purpose:   Support two flavors of image hint in the play screen:
--              - 'image'        : revealed when the teacher clicks the button
--                                 (same UX as text/jongsung/vowel/syllable hints)
--              - 'image_intro'  : shown from the start, like the category label
--                                 (no reveal button; auto-visible on entry)
--
--            Storage side:
--              - Create a private 'hint-images' bucket (5MB cap, common image MIMEs).
--              - RLS on storage.objects so a teacher can only read/write objects
--                under a top-level folder whose name equals their auth.uid().
--                Object key convention: `{auth.uid()}/{uuid}.{ext}`
-- =============================================================================


-- ---- 1) hints.type CHECK : add 'image_intro' --------------------------------
-- 'image' was already allowed since 0001, but the form UI didn't expose it.
-- We now expose both 'image' (reveal-button) and 'image_intro' (shown from start).

alter table public.hints drop constraint hints_type_check;
alter table public.hints add constraint hints_type_check
    check (type in (
        'text',
        'image',
        'image_intro',
        'reveal_jongsung',
        'reveal_vowel',
        'reveal_syllable'
    ));


-- ---- 2) Storage bucket -------------------------------------------------------
-- Private bucket: the play screen uses short-lived signed URLs to render images,
-- so the file path alone is not enough to view a hint without authentication
-- (defense-in-depth against accidental link sharing).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'hint-images',
    'hint-images',
    false,
    5 * 1024 * 1024,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;


-- ---- 3) storage.objects RLS policies ----------------------------------------
-- storage.objects has RLS enabled by default on Supabase. We add three policies
-- (SELECT / INSERT / DELETE) scoped to the 'hint-images' bucket and gated by
-- the first folder segment of the object key matching the caller's auth.uid().
-- We intentionally do NOT add an UPDATE policy — overwriting an existing key
-- isn't part of the flow (the form deletes + re-uploads under a new uuid),
-- and skipping it shrinks the attack surface.

create policy "hint-images: teachers can read own"
    on storage.objects for select to authenticated
    using (
        bucket_id = 'hint-images'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "hint-images: teachers can upload own"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'hint-images'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "hint-images: teachers can delete own"
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'hint-images'
        and (storage.foldername(name))[1] = auth.uid()::text
    );
