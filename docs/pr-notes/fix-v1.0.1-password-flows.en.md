# release: v1.0.1 — confirm password + password reset

## Summary

First patch after v1.0.0. Adds a confirm-password field on signup so
typos can't lock people out, and ships a full forgot/reset flow for
users who do forget their password.

## Changes

### Signup confirm password
- Adds a confirm-password input on `/signup`.
- Both client (`required`, `minLength`) and server (action) validate that
  the two values match before the Supabase signUp call.

### Password reset flow

```
/login → "비밀번호를 잊으셨나요?" link
  ↓
/forgot-password → email input → resetPasswordForEmail
  ↓
user clicks link in their inbox
  ↓
/auth/callback?code=xxx&next=/reset-password
  ↓ (exchangeCodeForSession ok)
/reset-password → new password input → updateUser
  ↓
/admin (already signed in via the recovery session)
```

- `src/app/forgot-password/{page,form,actions}.tsx` new.
- `src/app/reset-password/{page,form,actions}.tsx` new.
- `src/app/auth/callback/route.ts` new — Route Handler that exchanges
  the recovery code for a session and redirects to `?next=`.
- `src/app/login/page.tsx` — added forgot-password link.

### Release metadata
- `package.json` version `0.1.0` → `1.0.1`.
- README.md and README.ko.md gain a GitHub Release badge above the
  language toggle.

## Design decisions

### redirectTo built from request headers
`forgotPasswordAction` reads `headers().get('host')` and builds
`<protocol>://<host>/auth/callback?next=/reset-password`. Local dev
points at localhost, Vercel deploy at the production host — no extra
env var needed.

### Auth callback as a Route Handler, not a page
Token exchange has no UI; it's a redirect. A `route.ts` handler keeps
intent clear and avoids rendering an empty layout.

### `/reset-password` redirects unauthenticated visitors away
Direct access without going through the email link has no session, so
the page redirects to `/forgot-password` rather than rendering a useless
form.

### Confirm password validated on both sides
Client `required` + `minLength` is convenience. The action's strict
equality check is the source of truth so a manually-crafted POST can't
bypass it.

## Test plan

- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` clean
- [x] Manual:
  1. Mismatched confirm password shows "비밀번호가 일치하지 않아요".
  2. Matching passwords proceed to signup as before.
  3. Login page shows the forgot-password link.
  4. Forgot-password page sends a real email.
  5. Email link → callback → reset-password page.
  6. New password update redirects to /admin signed in.
  7. Logout + login with the new password works.

## Follow-ups

- Production hardening: re-enable email confirmation + add a captcha.
- Localize the Supabase email templates (currently English defaults).
