-- =============================================================================
-- Migration: 0002_quiz_creation_form_support
-- Purpose:   Two changes the quiz creation form (PR #4) needs.
--            1. Allow `reveal_vowel` as a valid hint type.
--            2. Add an optional `category` column to questions, surfaced on
--               the presentation screen as the first hint shown to students.
-- =============================================================================


-- 1. hints.type CHECK constraint — extend to include 'reveal_vowel'
-- Postgres auto-named the original inline CHECK as `hints_type_check`
-- (table_column_check pattern from the inline `check (...)` in 0001).
alter table public.hints drop constraint hints_type_check;
alter table public.hints add constraint hints_type_check
    check (type in ('text', 'image', 'reveal_jamo', 'reveal_vowel'));


-- 2. questions.category — free-text label like '음식', '동물', etc.
-- Nullable: teachers can leave it blank.
-- Existing rows get NULL; no backfill needed because PR #4 hasn't shipped yet.
alter table public.questions
    add column category text;
