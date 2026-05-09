# feat: teacher auth (email + password)

## Summary

Teacher authentication: signup, login, logout, and an auth guard that blocks
unauthenticated access to `/admin/*` and bounces logged-in users away from the
auth pages. Email + password via Supabase Auth, with email confirmation
disabled for the v1 demo.

## Changes

### Auth pages — `/signup`, `/login`

Each route is split into three files:

```
src/app/signup/
├── page.tsx     server component, static markup
├── form.tsx     client component, form interactivity
└── actions.ts   server action calling Supabase Auth
```

`/login` mirrors the same structure; differences are limited to
`signUp` ↔ `signInWithPassword` and the visible copy.

### Post-login home — `/admin`

- `src/app/admin/page.tsx` — welcome message (user email) + a large
  "퀴즈 만들기!" CTA + a logout button (form submitting a server action).
- `src/app/admin/actions.ts` — `logoutAction` server action.
- `src/app/admin/new/page.tsx` — placeholder for the real creation form
  landing in PR #4.

### Root redirect — `src/app/page.tsx`

Replaced the create-next-app default landing page. The root server component
inspects auth state and redirects:
- signed in → `/admin`
- signed out → `/login`

### Auth guard — `src/proxy.ts`

Extended the existing session-refresh proxy with two rules:
- `/admin/*` while signed out → redirect to `/login`
- `/login` or `/signup` while signed in → redirect to `/admin`

## Key design decisions

### Real email instead of a fake-email-from-username adapter

We considered a username + password UX backed by synthesized
`username@chosung-quiz.local` emails. Decided against it:
- Removes the need for a `username ↔ email` mapping helper.
- Keeps the Supabase Auth flow in its standard shape — better learning value
  and easier to layer password reset on later.

### Email confirmation off

`Confirm email` toggle is disabled in the Supabase dashboard so signup
completes synchronously. Suitable for the v1 demo; production hardening
(re-enable + captcha) is tracked as a follow-up.

### Guard at the proxy, not in each page

`proxy.ts` is the single chokepoint every request flows through before
hitting a route handler. Centralizing the guard here keeps page components
free of repeated `if (!user) redirect(...)` and makes it impossible to add
a new admin page that forgets the check.

### Friendly error messages

`translateAuthError()` maps known Supabase error strings (e.g.
`"Invalid login credentials"`) to user-facing Korean. Anything unknown falls
back to a generic Korean message. Aligns with the CLAUDE.md rule against
exposing raw DB/auth error strings to end users.

## Test plan

- [x] `npx tsc --noEmit` — passes
- [x] `npm run lint` — clean (no warnings, no errors)
- [x] Manual scenarios in browser:
  1. `/` redirects to `/login`
  2. `/signup` → signup → lands on `/admin` with welcome message
  3. `/admin` → "퀴즈 만들기!" → `/admin/new` placeholder
  4. Logout returns to `/login`
  5. Direct `/admin` access while signed out is bounced to `/login`
  6. Visiting `/login` while signed in bounces to `/admin`
  7. Re-login works as expected

## Follow-ups

- **PR #4** `feat: quiz creation form` — replaces the `/admin/new`
  placeholder with the real form. Includes the vowel-hint toggle and the
  `hints.type` CHECK extension migration adding `reveal_vowel`.
- **Production hardening**: re-enable email confirmation and add captcha
  before any public deployment.
