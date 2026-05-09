-- =============================================================================
-- Migration: 0003_replace_reveal_jamo_with_syllable_hints
-- Purpose:   Reshape `hints.type` to support the three-tier syllable reveal
--            model the quiz creation form (PR #4) is built around.
--
--            Drop `reveal_jamo` (single-jamo reveal proved redundant in our
--            chosung quiz domain — initial consonants are already on screen).
--
--            Add two finer-grained reveal types so teachers can pick exactly
--            how much of a chosen syllable to show:
--              - reveal_jongsung : just the final consonant (받침) of the syllable
--              - reveal_syllable : the whole syllable (자음+모음+받침)
--            (`reveal_vowel` already exists from migration 0002 and now means
--             "자음+모음 only, 받침 가림".)
-- =============================================================================

-- No data migration needed: PR #4 hasn't shipped, so no existing rows use
-- any of the affected types.

alter table public.hints drop constraint hints_type_check;
alter table public.hints add constraint hints_type_check
    check (type in ('text', 'image', 'reveal_jongsung', 'reveal_vowel', 'reveal_syllable'));
