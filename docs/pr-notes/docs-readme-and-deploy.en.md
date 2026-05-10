# docs: README + demo link + screenshots

## Summary

v1 wrap-up. Deployed to Vercel; the demo URL and four screenshots are now
woven into the README. Split the README into an English main file and a
Korean variant so both audiences land on something native.

## Changes

### `README.md` (English, main)
- Rewrote the previously-Korean README in English.
- Demo link: https://chosung-quiz-three.vercel.app
- Four screenshot embeds.
- Architecture highlights: RLS, Hangul Unicode handling, accumulated
  migrations, form generalization, pattern-C jongsung rendering.
- Local development + Supabase setup steps.
- Roadmap.

### `README.ko.md` (Korean, new)
- Mirrors the main README with Korean copy.
- Adds a "portfolio talking points" section.
- Cross-links to the English README.

### `docs/screenshots/`
- Four captures: login / admin list / create form / play screen with the
  jongsung row pattern visible.

## Test plan

- [x] Vercel deploy is up at https://chosung-quiz-three.vercel.app
- [x] Signup → create → play flow works on the deployed instance
- [x] Cross-link between READMEs renders both ways
- [x] All four screenshots render in both files

## v1 status

| PR | What | State |
|---|---|---|
| #1 | scaffold | ✅ |
| #2 | db schema + RLS | ✅ |
| #3 | teacher auth | ✅ |
| #4 | quiz creation form | ✅ |
| #5 | quiz list / edit / delete | ✅ |
| #6 | play mode + guide + rename | ✅ |
| **#7** | **README + demo + screenshots** | **this PR** |

The core teacher-flow ships with this PR.

## Follow-ups

- Image hints (Supabase Storage)
- AI-assisted quiz generation (Claude API)
- Modal-based confirms
- Production hardening (re-enable email confirmation + captcha)
