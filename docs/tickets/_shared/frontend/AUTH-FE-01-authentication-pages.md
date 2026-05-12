# [AUTH-FE-01] Authentication Pages — Login, 2FA, Forgot Password

**Role:** Shared (all 6 in-scope roles: Admin, Billing Officer, Social Worker, HIM Coder, Surveillance, Auditor)
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 1.1 — Secure Login with 2FA (USER_STORIES.md §1)
**Flow Refs:** Flow A1 — Secure Login with 2FA (USER_FLOWS.md §A1)

## Description

Build the authentication surface used by every in-scope role. Pages live in a shared shell — not under any role-specific route group. Wires to `ADM-BE-02` (sign-in + 2FA) and the password reset endpoints added to `ADM-BE-02` (`auth.password.requestReset`, `auth.password.confirmReset`).

## Pages to Build

| Page | Route | Source |
|------|-------|--------|
| Login Page | `/login` | Flow A1 step 2 |
| 2FA Verification Page | `/login/2fa` | Flow A1 steps 5–7 |
| Forgot Password — Request | `/forgot-password` | Flow A1 (Forgot Password link) |
| Forgot Password — Sent Confirmation | `/forgot-password/sent` | Flow A1 |
| Forgot Password — Reset Form | `/forgot-password/reset?token=...` | Flow A1 |
| Role-Based Home Dashboard Router | `/` (post-auth redirect) | Flow A1 step 8 |

## Functional Requirements (per Flow A1)

- **Login Page:** email + password inputs, "Remember me" checkbox, `Forgot password?` link, primary CTA `Sign In`. Inline error for invalid credentials. After successful credentials submission, redirect to `/login/2fa` with the challenge token in a secure cookie.
- **2FA Verification Page:** 6-digit code input (auto-advance per digit, paste support), countdown timer for code expiry (default 5 min), `Resend Code` CTA disabled until 30s cooldown. On success, route to `/`.
- **Forgot Password — Request:** email input, `Send Reset Link` CTA. Always returns the same success message regardless of email existence (anti-enumeration).
- **Forgot Password — Sent Confirmation:** static message acknowledging email dispatched.
- **Forgot Password — Reset Form:** loaded via signed token URL; new password + confirm password inputs with strength meter. On success, all sessions invalidated server-side (per `ADM-BE-02` extension), user redirected to `/login`.
- **Role-Based Home Dashboard Router:** server component reads the authenticated user's role and `redirect()`s to:
  - `Administrator` → `/admin`
  - `Billing Officer` → `/billing`
  - `Social Worker` → `/msw`
  - `HIM Coder` → `/him`
  - `Surveillance` → `/surveillance`
  - `Auditor` → `/auditor`

## Acceptance Criteria

- [ ] 2FA enforced for all 6 in-scope roles — sign-in alone never produces a usable session.
- [ ] Account lockout after N failed login attempts (configurable, default 5) — UI shows lockout banner with cooldown countdown returned by the backend.
- [ ] Redirect by role enum to the correct dashboard route; unknown roles route to `/login` with an error toast.
- [ ] "Remember me" checkbox toggles secure cookie TTL (default 30 days when checked, session-only otherwise) — TTL passed to `ADM-BE-02` sign-in endpoint.
- [ ] Responsive design verified at desktop (1280px+) and tablet (768–1024px) clinical workstation widths.
- [ ] Accessibility: ARIA labels on every input, keyboard-only navigation works end-to-end, focus trap on the 2FA modal/page, password fields have `aria-describedby` linking to strength meter.
- [ ] Forgot Password Request returns identical success copy whether email exists or not.
- [ ] 2FA Resend Code CTA throttled at 30s minimum interval client-side, enforced again on the server.
- [ ] Reset password strength meter rejects passwords below the policy minimum (12 chars, mixed case, number, symbol).
- [ ] No role-specific UI elements anywhere in this ticket — pages are role-agnostic.
- [ ] `pnpm lint && pnpm typecheck` clean.

## Folder Structure

```
apps/web/app/
├── login/
│   ├── page.tsx          # Login Page
│   └── 2fa/page.tsx      # 2FA Verification Page
├── forgot-password/
│   ├── page.tsx          # Request form
│   ├── sent/page.tsx     # Sent confirmation
│   └── reset/page.tsx    # Reset form (token via searchParams)
└── page.tsx              # Role-Based Home Dashboard Router
```

`apps/web/features/auth/` for hooks, schemas, and shared auth components (no business logic outside this folder).

## Dependencies

- `ADM-BE-02` (sign-in + 2FA endpoints).
- `ADM-BE-02` extension (password reset endpoints — see ticket revision).
- `ADM-FE-02` design system primitives.

## References

- USER_FLOWS.md §A1 — Secure Login with 2FA, full step list and Wireframe Pages.
- USER_STORIES.md §1 Story 1.1 — Secure Login with 2FA.
- TOR §4.2 — Privacy, Security; DPA-compliant audit entry on session creation; least-privileged access controls.
- TOR §1 — Role definitions used by the home-dashboard router.
- Project CLAUDE.md — Better Auth (`@repo/auth`), Next.js App Router conventions.
